// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * IRocketDepositPool
 * 
 * Minimal interface for Rocket Pool's deposit pool contract
 * Used to stake ETH and receive rETH
 */
interface IRocketDepositPool {
    /**
     * Deposit ETH to Rocket Pool and receive rETH
     * Called with msg.value (the ETH amount to stake)
     */
    function deposit() external payable;

    /**
     * Get deposit accepted flag (can accept deposits)
     */
    function getDepositEnabled() external view returns (bool);
}
