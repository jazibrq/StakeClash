// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Hedera HBAR Season Vault (EVM contract)
 * 
 * DESIGN:
 * - Users deposit HBAR during deposit window (before depositEnd)
 * - Game engine adds points during season (seasonStart to seasonEnd)
 * - At season end: finalize() snapshots yield = max(0, balance - totalPrincipal)
 * - Users redeem: payout = principal + (yield * userPoints / totalPoints)
 * 
 * STAKING:
 * - Hedera-native staking is configured on contract account via Hedera SDK
 *   (ContractCreateTransaction with setStakedNodeId + setDeclineStakingReward)
 * - Staking rewards accrue automatically to contract; included in balance at finalize.
 * 
 * EDGE CASES:
 * - If totalPoints == 0: yield remains in contract (not distributed)
 * - If user never deposited: redeem() returns 0 payout
 * - receive() is disabled; only deposit() calls accepted
 */
contract HBARSeasonVault {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Errors (cheaper than strings)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    error NotGameEngine();
    error DepositClosed();
    error SeasonNotStarted();
    error SeasonNotEnded();
    error AlreadyFinalized();
    error NotFinalized();
    error AlreadyRedeemed();
    error ZeroDeposit();
    error InsufficientContractBalance();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Reentrancy Guard
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrancy detected");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Configuration (immutable)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    address public immutable GAME_ENGINE;

    uint64 public immutable depositEnd;      // Unix timestamp when deposits close
    uint64 public immutable seasonStart;     // Unix timestamp when season begins (can == depositEnd)
    uint64 public immutable seasonEnd;       // Unix timestamp when season concludes

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Accounting
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Principal tracking
    mapping(address => uint256) public principal;
    uint256 public totalPrincipal;

    // Points tracking (earned during season via addPoints)
    mapping(address => uint256) public points;
    uint256 public totalPoints;

    // Finalization state
    bool public finalized;
    uint256 public totalYieldSnapshot;

    // Redemption tracking
    mapping(address => bool) public redeemed;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Events
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    event Deposited(address indexed user, uint256 amount, uint256 newUserPrincipal, uint256 newTotalPrincipal);
    event PointsAdded(address indexed user, uint256 amount, uint256 newUserPoints, uint256 newTotalPoints);
    event Finalized(uint256 totalAssets, uint256 totalPrincipalAtEnd, uint256 totalYieldEarned);
    event Redeemed(address indexed user, uint256 principalPaid, uint256 yieldPaid, uint256 totalPaid);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Constructor
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    constructor(
        address gameEngine,
        uint64 _depositEnd,
        uint64 _seasonStart,
        uint64 _seasonEnd
    ) {
        require(gameEngine != address(0), "GAME_ENGINE cannot be zero");
        require(_depositEnd > block.timestamp, "depositEnd must be in future");
        require(_seasonStart >= _depositEnd, "seasonStart must be >= depositEnd");
        require(_seasonEnd > _seasonStart, "seasonEnd must be > seasonStart");

        GAME_ENGINE = gameEngine;
        depositEnd = _depositEnd;
        seasonStart = _seasonStart;
        seasonEnd = _seasonEnd;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Access Control
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    modifier onlyGameEngine() {
        if (msg.sender != GAME_ENGINE) revert NotGameEngine();
        _;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Deposit Function (HBAR/ETH)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * User calls this to deposit HBAR into the vault.
     * Must occur before depositEnd.
     */
    function deposit() external payable nonReentrant {
        if (block.timestamp > depositEnd) revert DepositClosed();
        if (msg.value == 0) revert ZeroDeposit();

        principal[msg.sender] += msg.value;
        totalPrincipal += msg.value;

        emit Deposited(msg.sender, msg.value, principal[msg.sender], totalPrincipal);
    }

    /**
     * Disable receive() to force explicit deposit() calls.
     * This ensures time-window checks and event logging.
     */
    receive() external payable {
        revert("Use deposit() function");
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Points System (Game Engine only)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * Game engine calls this to award points to a user.
     * Only callable during active season: seasonStart <= now < seasonEnd
     */
    function addPoints(address user, uint256 amount) external onlyGameEngine {
        if (block.timestamp < seasonStart) revert SeasonNotStarted();
        if (block.timestamp >= seasonEnd) revert SeasonNotEnded();

        if (user == address(0) || amount == 0) return;

        points[user] += amount;
        totalPoints += amount;

        emit PointsAdded(user, amount, points[user], totalPoints);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Finalize Season
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * Called after seasonEnd to snapshot thetotal yield.
     * Yield = max(0, contractBalance - totalPrincipal)
     * This includes any staking rewards accumulated during the season.
     */
    function finalize() external nonReentrant {
        if (block.timestamp < seasonEnd) revert SeasonNotEnded();
        if (finalized) revert AlreadyFinalized();

        uint256 totalAssets = address(this).balance;

        // Calculate yield earned (floored at 0)
        uint256 yieldEarned = 0;
        if (totalAssets > totalPrincipal) {
            yieldEarned = totalAssets - totalPrincipal;
        }

        totalYieldSnapshot = yieldEarned;
        finalized = true;

        emit Finalized(totalAssets, totalPrincipal, yieldEarned);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Redemption
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * User calls after finalization to redeem principal + pro-rata yield.
     * 
     * Payout formula:
     *   userYield = (totalYieldSnapshot * userPoints) / totalPoints
     *   totalPayout = userPrincipal + userYield
     * 
     * If totalPoints == 0, userYield = 0 and user receives only principal.
     */
    function redeem() external nonReentrant {
        if (!finalized) revert NotFinalized();
        if (redeemed[msg.sender]) revert AlreadyRedeemed();

        uint256 userPrincipal = principal[msg.sender];

        // If no deposits, mark redeemed and return
        if (userPrincipal == 0) {
            redeemed[msg.sender] = true;
            emit Redeemed(msg.sender, 0, 0, 0);
            return;
        }

        // Calculate user's yield share
        uint256 userYield = 0;
        if (totalPoints > 0) {
            userYield = (totalYieldSnapshot * points[msg.sender]) / totalPoints;
        }
        // If totalPoints == 0, userYield remains 0 (yield stays in contract)

        uint256 payout = userPrincipal + userYield;

        // Effects: mark redeemed and clear principal
        redeemed[msg.sender] = true;
        principal[msg.sender] = 0;

        // Safety check: ensure contract has sufficient balance
        if (address(this).balance < payout) revert InsufficientContractBalance();

        // Interaction: send payout
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit Redeemed(msg.sender, userPrincipal, userYield, payout);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // View Functions (for frontend/testing)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Preview what a user would receive on redemption.
     * Returns (principalAmount, yieldAmount, totalPayout)
     */
    function previewRedeem(address user) external view returns (uint256, uint256, uint256) {
        uint256 userPrincipal = principal[user];
        uint256 userYield = 0;

        if (finalized && totalPoints > 0) {
            userYield = (totalYieldSnapshot * points[user]) / totalPoints;
        }

        return (userPrincipal, userYield, userPrincipal + userYield);
    }

    /**
     * Check if a user is eligible to redeem (finalized, not already redeemed, has balance).
     */
    function canRedeem(address user) external view returns (bool) {
        return finalized && !redeemed[user] && principal[user] > 0;
    }

    /**
     * Get current contract balance (includes accrued staking rewards).
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
