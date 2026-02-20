// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract TimedRefundVault {

    // ── State ─────────────────────────────────────────────────────────────────
    address public depositor;
    uint256 public amount;
    bool    public refunded;

    bool private locked;

    // ── Events ────────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Refunded(address indexed user, uint256 amount);

    // ── Reentrancy guard ──────────────────────────────────────────────────────
    modifier nonReentrant() {
        require(!locked, "reentrant");
        locked = true;
        _;
        locked = false;
    }

    // ── External functions ────────────────────────────────────────────────────

    /// @notice Step 1 — send HBAR to the vault.
    function deposit() external payable {
        require(msg.value > 0, "must send value");
        require(depositor == address(0), "deposit already pending");

        depositor = msg.sender;
        amount    = msg.value;
        refunded  = false;

        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Step 2 — called automatically by HSS after the scheduled delay.
    function refund() external nonReentrant {
        require(!refunded,              "already refunded");
        require(depositor != address(0), "no deposit");

        address _depositor = depositor;
        uint256 _amount    = amount;

        refunded  = true;
        depositor = address(0);
        amount    = 0;

        (bool ok, ) = _depositor.call{value: _amount}("");
        require(ok, "transfer failed");

        emit Refunded(_depositor, _amount);
    }

    receive() external payable {}
}
