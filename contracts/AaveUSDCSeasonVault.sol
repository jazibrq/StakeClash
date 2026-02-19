// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step} from "./access/Ownable2Step.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";
import {SafeERC20} from "./libraries/SafeERC20.sol";
import {IERC20} from "./token/IERC20.sol";
import {IPoolAddressesProvider} from "./interfaces/aave/IPoolAddressesProvider.sol";
import {IPool} from "./interfaces/aave/IPool.sol";
import {IAaveProtocolDataProvider} from "./interfaces/aave/IAaveProtocolDataProvider.sol";

contract AaveUSDCSeasonVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidWindow();
    error DepositsClosed();
    error ZeroAmount();
    error NotGameEngine();
    error SeasonNotEnded();
    error AlreadyFinalized();
    error NotFinalized();
    error AlreadyWithdrawn();
    error NoPrincipal();
    error InvalidReserve();
    error GameEngineFrozen();
    error NoPendingGameEngine();
    error UnauthorizedGameEngineAccept();
    error WithdrawMismatch();
    error RescueForbiddenToken();

    IPoolAddressesProvider public immutable addressesProvider;
    IPool public immutable pool;
    IAaveProtocolDataProvider public immutable protocolDataProvider;

    IERC20 public immutable usdc;
    IERC20 public immutable aUsdc;

    address public gameEngine;
    address public pendingGameEngine;

    uint256 public immutable depositStart;
    uint256 public immutable depositEnd;
    uint256 public immutable seasonEnd;

    uint256 public totalPrincipal;
    uint256 public totalPoints;

    mapping(address => uint256) public principal;
    mapping(address => uint256) public points;
    mapping(address => bool) public withdrawn;

    bool public seasonFinalized;
    uint256 public finalTotalAssets;
    uint256 public finalTotalYield;
    uint256 public carryOverYield;

    event Deposited(address indexed user, uint256 amount, uint256 newUserPrincipal, uint256 newTotalPrincipal);
    event SuppliedToAave(uint256 amount, address indexed poolAddress);
    event PointsAwarded(address indexed user, uint256 delta, uint256 newUserPoints, uint256 newTotalPoints);
    event SeasonEnded(uint256 finalTotalAssets, uint256 totalPrincipal, uint256 finalTotalYield, uint256 carryOverYield);
    event Withdrawn(address indexed user, uint256 principalAmount, uint256 yieldShare, uint256 withdrawnAmount);
    event GameEngineProposed(address indexed currentGameEngine, address indexed proposedGameEngine);
    event GameEngineAccepted(address indexed previousGameEngine, address indexed newGameEngine);

    modifier onlyGameEngine() {
        if (msg.sender != gameEngine) revert NotGameEngine();
        _;
    }

    constructor(
        address _usdc,
        address _addressesProvider,
        address _protocolDataProvider,
        uint256 _depositStart,
        uint256 _depositEnd,
        uint256 _seasonEnd,
        address _gameEngine
    ) {
        if (_usdc == address(0) || _addressesProvider == address(0) || _protocolDataProvider == address(0) || _gameEngine == address(0)) {
            revert InvalidAddress();
        }
        if (!(_depositStart < _depositEnd && _depositEnd < _seasonEnd)) {
            revert InvalidWindow();
        }

        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        protocolDataProvider = IAaveProtocolDataProvider(_protocolDataProvider);

        address poolAddress = IPoolAddressesProvider(_addressesProvider).getPool();
        if (poolAddress == address(0)) revert InvalidAddress();
        pool = IPool(poolAddress);

        usdc = IERC20(_usdc);

        (address aTokenAddress,,) = IAaveProtocolDataProvider(_protocolDataProvider).getReserveTokensAddresses(_usdc);
        if (aTokenAddress == address(0)) revert InvalidReserve();
        aUsdc = IERC20(aTokenAddress);

        depositStart = _depositStart;
        depositEnd = _depositEnd;
        seasonEnd = _seasonEnd;

        gameEngine = _gameEngine;
    }

    function proposeGameEngine(address newGameEngine) external onlyOwner {
        if (block.timestamp >= depositStart) revert GameEngineFrozen();
        if (newGameEngine == address(0)) revert InvalidAddress();

        pendingGameEngine = newGameEngine;
        emit GameEngineProposed(gameEngine, newGameEngine);
    }

    function acceptGameEngine() external {
        address pending = pendingGameEngine;
        if (pending == address(0)) revert NoPendingGameEngine();
        if (msg.sender != pending) revert UnauthorizedGameEngineAccept();

        address previous = gameEngine;
        gameEngine = pending;
        pendingGameEngine = address(0);

        emit GameEngineAccepted(previous, gameEngine);
    }

    function deposit(uint256 amount) external nonReentrant {
        if (block.timestamp < depositStart || block.timestamp >= depositEnd) revert DepositsClosed();
        if (seasonFinalized) revert AlreadyFinalized();
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        principal[msg.sender] += amount;
        totalPrincipal += amount;

        usdc.forceApprove(address(pool), amount);
        pool.supply(address(usdc), amount, address(this), 0);

        emit Deposited(msg.sender, amount, principal[msg.sender], totalPrincipal);
        emit SuppliedToAave(amount, address(pool));
    }

    function awardPoints(address user, uint256 delta) external onlyGameEngine {
        if (user == address(0)) revert InvalidAddress();
        if (seasonFinalized) revert AlreadyFinalized();
        if (block.timestamp >= seasonEnd) revert SeasonNotEnded();
        if (delta == 0) return;

        points[user] += delta;
        totalPoints += delta;

        emit PointsAwarded(user, delta, points[user], totalPoints);
    }

    function endSeason() external {
        if (block.timestamp < seasonEnd) revert SeasonNotEnded();
        if (seasonFinalized) revert AlreadyFinalized();

        uint256 assets = aUsdc.balanceOf(address(this));
        finalTotalAssets = assets;

        if (assets > totalPrincipal) {
            finalTotalYield = assets - totalPrincipal;
        } else {
            finalTotalYield = 0;
        }

        if (totalPoints == 0 && finalTotalYield > 0) {
            carryOverYield += finalTotalYield;
        }

        seasonFinalized = true;

        emit SeasonEnded(finalTotalAssets, totalPrincipal, finalTotalYield, carryOverYield);
    }

    function previewWithdraw(address user)
        external
        view
        returns (uint256 principalAmount, uint256 yieldShare, uint256 withdrawAmount)
    {
        principalAmount = principal[user];
        if (!seasonFinalized || withdrawn[user] || principalAmount == 0) {
            return (principalAmount, 0, 0);
        }

        if (totalPoints > 0) {
            yieldShare = (finalTotalYield * points[user]) / totalPoints;
        } else {
            yieldShare = 0;
        }

        withdrawAmount = principalAmount + yieldShare;
    }

    function withdraw() external nonReentrant {
        if (!seasonFinalized) revert NotFinalized();
        if (withdrawn[msg.sender]) revert AlreadyWithdrawn();

        uint256 principalAmount = principal[msg.sender];
        if (principalAmount == 0) revert NoPrincipal();

        uint256 yieldShare;
        if (totalPoints > 0) {
            yieldShare = (finalTotalYield * points[msg.sender]) / totalPoints;
        }

        uint256 amountToWithdraw = principalAmount + yieldShare;

        withdrawn[msg.sender] = true;

        uint256 actual = pool.withdraw(address(usdc), amountToWithdraw, msg.sender);
        if (actual != amountToWithdraw) revert WithdrawMismatch();

        emit Withdrawn(msg.sender, principalAmount, yieldShare, amountToWithdraw);
    }

    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(usdc) || token == address(aUsdc)) {
            revert RescueForbiddenToken();
        }
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, amount);
    }

    function getCurrentTotalAssets() external view returns (uint256) {
        return aUsdc.balanceOf(address(this));
    }
}
