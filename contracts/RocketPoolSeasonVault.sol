// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step} from "./access/Ownable2Step.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";
import {IRocketDepositPool} from "./interfaces/IRocketDepositPool.sol";
import {IReth} from "./interfaces/IReth.sol";

/**
 * RocketPoolSeasonVault
 * 
 * An ETH staking season vault that:
 * - Users deposit ETH during deposit window
 * - ETH is immediately staked into Rocket Pool, receiving rETH
 * - Yield = increase in rETH value (in ETH terms) over the season
 * - Users withdraw principal + pro-rata yield share based on points earned
 * - All accounting is in ETH value terms; payouts are in rETH
 * 
 * DESIGN NOTES:
 * - Uses ETH-value accounting throughout (no raw token count confusion)
 * - rETH appreciates vs ETH as staking rewards accrue
 * - If totalPoints == 0, yield stays in contract (no distribution)
 * - Withdrawals are rETH-only for guaranteed solvency
 * - Two-step admin pattern for GAME_ENGINE updates (security)
 */
contract RocketPoolSeasonVault is Ownable2Step, ReentrancyGuard {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Errors
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    error InvalidConstructorArgs();
    error InvalidAddress();
    error NotGameEngine();
    error DepositWindowClosed();
    error DepositWindowNotOpen();
    error SeasonNotEnded();
    error SeasonNotFinalized();
    error AlreadyFinalized();
    error NotWithdrawn();
    error AlreadyWithdrawn();
    error ZeroDeposit();
    error NoWithdrawableAmount();
    error GameEngineChangeNotPending();
    error GameEngineCannotChangeAfterSeasonEnd();
    error InsufficientRethBalance();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Configuration (immutable)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    IRocketDepositPool public immutable rocketDepositPool;
    IReth public immutable reth;

    uint256 public immutable depositStart;
    uint256 public immutable depositEnd;
    uint256 public immutable seasonEnd;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // State: Game Engine & Admin
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    address public gameEngine;

    // Two-step game engine update
    address public pendingGameEngine;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // State: Accounting (all in ETH wei)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    mapping(address => uint256) public principalEth;      // User's ETH deposit amount
    uint256 public totalPrincipalEth;

    mapping(address => uint256) public points;            // User's points
    uint256 public totalPoints;

    mapping(address => bool) public hasWithdrawn;         // Per-user withdrawal flag

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // State: Season Finalization
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    bool public seasonFinalized;
    uint256 public finalVaultEthValue;                    // Total ETH value at finalization
    uint256 public finalTotalYieldEth;                    // Total yield (rounding remainder)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Events
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    event Deposited(
        address indexed user,
        uint256 ethAmount,
        uint256 rethReceived,
        uint256 newUserPrincipal,
        uint256 newTotalPrincipal
    );

    event PointsAwarded(
        address indexed user,
        uint256 delta,
        uint256 newUserPoints,
        uint256 newTotalPoints
    );

    event SeasonEnded(
        uint256 finalVaultEthValue,
        uint256 finalTotalYieldEth,
        uint256 remainderRethWei
    );

    event Withdrawn(
        address indexed user,
        uint256 principalEthValue,
        uint256 yieldEthShare,
        uint256 totalRethTransferred
    );

    event GameEnginePending(address indexed newGameEngine);
    event GameEngineChanged(address indexed oldGameEngine, address indexed newGameEngine);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Constructor
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    constructor(
        address _rocketDepositPool,
        address _reth,
        address _gameEngine,
        uint256 _depositStart,
        uint256 _depositEnd,
        uint256 _seasonEnd
    ) Ownable2Step() {
        // Validate arguments
        if (
            _rocketDepositPool == address(0) ||
            _reth == address(0) ||
            _gameEngine == address(0)
        ) {
            revert InvalidConstructorArgs();
        }
        if (_depositStart >= _depositEnd || _depositEnd >= _seasonEnd) {
            revert InvalidConstructorArgs();
        }

        rocketDepositPool = IRocketDepositPool(_rocketDepositPool);
        reth = IReth(_reth);
        gameEngine = _gameEngine;

        depositStart = _depositStart;
        depositEnd = _depositEnd;
        seasonEnd = _seasonEnd;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Admin: Two-Step Game Engine Update
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Owner proposes a new game engine (first step)
     * Can only be done before seasonEnd
     */
    function proposeGameEngine(address _newGameEngine) external onlyOwner {
        if (block.timestamp >= seasonEnd) {
            revert GameEngineCannotChangeAfterSeasonEnd();
        }
        if (_newGameEngine == address(0)) {
            revert InvalidAddress();
        }

        pendingGameEngine = _newGameEngine;
        emit GameEnginePending(_newGameEngine);
    }

    /**
     * New game engine accepts the proposal (second step)
     */
    function acceptGameEngine() external {
        if (pendingGameEngine == address(0)) {
            revert GameEngineChangeNotPending();
        }
        if (msg.sender != pendingGameEngine) {
            revert NotGameEngine();
        }

        address oldEngine = gameEngine;
        gameEngine = pendingGameEngine;
        pendingGameEngine = address(0);

        emit GameEngineChanged(oldEngine, gameEngine);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // User: Deposits
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Deposit ETH during deposit window
     * ETH is immediately staked to Rocket Pool for rETH
     */
    function deposit() external payable nonReentrant {
        if (block.timestamp < depositStart || block.timestamp >= depositEnd) {
            revert DepositWindowClosed();
        }
        if (msg.value == 0) {
            revert ZeroDeposit();
        }

        uint256 ethAmount = msg.value;
        uint256 beforeRethBalance = reth.balanceOf(address(this));

        // Record principal in ETH
        principalEth[msg.sender] += ethAmount;
        totalPrincipalEth += ethAmount;

        // Stake ETH to Rocket Pool
        // This gives the vault rETH (1 ETH of deposit → ~1 rETH, exact amount depends on exchange rate)
        rocketDepositPool.deposit{value: ethAmount}();

        // Get rETH balance received (not strictly necessary for accounting, but useful for events)
        uint256 afterRethBalance = reth.balanceOf(address(this));
        uint256 rethReceivedDelta = afterRethBalance - beforeRethBalance;

        emit Deposited(
            msg.sender,
            ethAmount,
            rethReceivedDelta,
            principalEth[msg.sender],
            totalPrincipalEth
        );
    }

    /**
     * Reject plain ETH transfers; only deposit() counts as user activity
     */
    receive() external payable {
        revert("Use deposit() function");
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Game Engine: Award Points
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Award points to a user (only game engine can call this)
     */
    function awardPoints(address _user, uint256 _delta) external {
        if (msg.sender != gameEngine) {
            revert NotGameEngine();
        }
        if (_user == address(0)) {
            revert InvalidAddress();
        }
        if (block.timestamp < depositStart || block.timestamp >= seasonEnd) {
            revert DepositWindowNotOpen(); // Can only award points during active season
        }
        if (_delta == 0) {
            return;
        }

        points[_user] += _delta;
        totalPoints += _delta;

        emit PointsAwarded(_user, _delta, points[_user], totalPoints);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Season: Finalization
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Finalize the season after seasonEnd
     * Snapshots total yield from vault's rETH position
     */
    function endSeason() external nonReentrant {
        if (block.timestamp < seasonEnd) {
            revert SeasonNotEnded();
        }
        if (seasonFinalized) {
            revert AlreadyFinalized();
        }

        // Get vault's total rETH balance and convert to ETH value
        uint256 vaultRethBalance = reth.balanceOf(address(this));
        uint256 vaultEthValue = reth.getEthValue(vaultRethBalance);

        // Yield = current value - principal (floored at 0)
        uint256 yieldEth = 0;
        if (vaultEthValue > totalPrincipalEth) {
            yieldEth = vaultEthValue - totalPrincipalEth;
        }

        finalVaultEthValue = vaultEthValue;
        finalTotalYieldEth = yieldEth;
        seasonFinalized = true;

        // Emit any rounding remainder for transparency
        emit SeasonEnded(vaultEthValue, yieldEth, vaultRethBalance);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // User: Withdrawal
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Preview what user would receive on withdrawal
     * Returns (principalEthValue, yieldEthShare, payoutRethAmount)
     */
    function previewWithdraw(address _user)
        external
        view
        returns (uint256 principalEth_, uint256 yieldEthShare, uint256 payoutRethAmount)
    {
        principalEth_ = principalEth[_user];

        if (hasWithdrawn[_user] || principalEth_ == 0 || !seasonFinalized) {
            return (principalEth_, 0, 0);
        }

        // If season finalized but no points, yield is 0
        yieldEthShare = 0;
        if (totalPoints > 0) {
            yieldEthShare = (finalTotalYieldEth * points[_user]) / totalPoints;
        }

        // Convert total desired ETH value to rETH amount
        uint256 totalEthValue = principalEth_ + yieldEthShare;
        payoutRethAmount = reth.getRethValue(totalEthValue);

        return (principalEth_, yieldEthShare, payoutRethAmount);
    }

    /**
     * User withdraws principal + yield in rETH
     */
    function withdraw() external nonReentrant {
        if (!seasonFinalized) {
            revert SeasonNotFinalized(); // Can't withdraw before season ends
        }
        if (hasWithdrawn[msg.sender]) {
            revert AlreadyWithdrawn();
        }

        uint256 userPrincipalEth = principalEth[msg.sender];
        if (userPrincipalEth == 0) {
            revert NoWithdrawableAmount();
        }

        // Calculate user's yield share
        uint256 userYieldEth = 0;
        if (totalPoints > 0) {
            userYieldEth = (finalTotalYieldEth * points[msg.sender]) / totalPoints;
        }

        // Total ETH value user should receive
        uint256 totalEthValue = userPrincipalEth + userYieldEth;

        // Convert to rETH amount
        uint256 payoutReth = reth.getRethValue(totalEthValue);

        // Mark as withdrawn (reentrancy safety via nonReentrant)
        hasWithdrawn[msg.sender] = true;

        // Check we have enough rETH
        uint256 vaultRethBalance = reth.balanceOf(address(this));
        if (vaultRethBalance < payoutReth) {
            revert InsufficientRethBalance();
        }

        // Transfer rETH to user
        bool success = reth.transfer(msg.sender, payoutReth);
        require(success, "rETH transfer failed");

        emit Withdrawn(msg.sender, userPrincipalEth, userYieldEth, payoutReth);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // View: Status & Debug
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Get current vault's rETH balance
     */
    function getVaultRethBalance() external view returns (uint256) {
        return reth.balanceOf(address(this));
    }

    /**
     * Get current vault's ETH value (to debug how much yield has accrued)
     */
    function getVaultEthValue() external view returns (uint256) {
        uint256 vaultRethBalance = reth.balanceOf(address(this));
        return reth.getEthValue(vaultRethBalance);
    }

    /**
     * Get current exchange rate (rETH per ETH)
     */
    function getExchangeRate() external view returns (uint256) {
        return reth.getExchangeRate();
    }
}
