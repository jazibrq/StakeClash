// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * IReth
 * 
 * Minimal interface for Rocket Pool's rETH token
 * Includes ERC20 + Rocket Pool specific value conversion functions
 */
interface IReth {
    /**
     * ERC20: Get balance of account
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * ERC20: Get total supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * ERC20: Transfer rETH to another account
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * ERC20: Approve spending
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * ERC20: TransferFrom
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * ERC20: Allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * Rocket Pool: Get ETH value of rETH amount
     * @param _rethAmount Amount of rETH in wei
     * @return Amount in ETH wei
     */
    function getEthValue(uint256 _rethAmount) external view returns (uint256);

    /**
     * Rocket Pool: Get rETH amount needed for desired ETH value
     * @param _ethAmount Desired ETH value in wei
     * @return Amount of rETH needed in wei
     */
    function getRethValue(uint256 _ethAmount) external view returns (uint256);

    /**
     * Rocket Pool: Get current exchange rate (rETH per ETH)
     * @return Exchange rate in wei (1 ETH = rate wei of rETH)
     */
    function getExchangeRate() external view returns (uint256);

    // ERC20 events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
