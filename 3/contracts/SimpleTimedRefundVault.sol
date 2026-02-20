// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHederaScheduleService {
    function scheduleCall(
        address to,
        uint256 gasLimit,
        uint256 value,
        uint64 expirySecond,
        bytes calldata data
    ) external returns (int64 responseCode, address scheduleAddress);
}

contract SimpleTimedRefundVault {
    uint256 private constant DEFAULT_GAS_LIMIT = 500_000;

    IHederaScheduleService private constant HSS =
        IHederaScheduleService(address(0x16b));

    address public depositor;
    uint256 public amount;
    bool public refunded;
    address public lastSchedule;
    uint64 public refundTime;

    bool private _locked;

    event Deposited(address indexed user, uint256 amount, uint64 refundTime);
    event ScheduleCreated(int64 responseCode, address scheduleAddress);
    event Refunded(address indexed user, uint256 amount);

    error ScheduleFailed(int64 responseCode);

    modifier nonReentrant() {
        require(!_locked, "reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    receive() external payable {}

    function depositAndScheduleRefund() external payable {
        require(msg.value > 0, "must send HBAR");
        require(depositor == address(0) || refunded, "active deposit exists");

        depositor = msg.sender;
        amount = msg.value;
        refunded = false;

        uint64 _refundTime = uint64(block.timestamp + 60);
        refundTime = _refundTime;

        bytes memory callData = abi.encodeWithSelector(this.refund.selector);

        (int64 responseCode, address scheduleAddress) = HSS.scheduleCall(
            address(this),
            DEFAULT_GAS_LIMIT,
            0,
            _refundTime,
            callData
        );

        if (scheduleAddress == address(0)) {
            revert ScheduleFailed(responseCode);
        }

        lastSchedule = scheduleAddress;

        emit Deposited(msg.sender, msg.value, _refundTime);
        emit ScheduleCreated(responseCode, scheduleAddress);
    }

    function refund() external nonReentrant {
        require(!refunded, "already refunded");
        require(block.timestamp >= refundTime, "too early");

        address _depositor = depositor;
        uint256 _amount = amount;

        // CEI: mark settled before external call
        refunded = true;
        depositor = address(0);
        amount = 0;
        refundTime = 0;

        (bool ok, ) = _depositor.call{value: _amount}("");
        require(ok, "transfer failed");

        emit Refunded(_depositor, _amount);
    }
}
