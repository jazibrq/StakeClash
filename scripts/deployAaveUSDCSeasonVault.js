#!/usr/bin/env node
import "dotenv/config";
import { ethers } from "hardhat";

/**
 * Deploy AaveUSDCSeasonVault to Sepolia.
 *
 * Required env vars:
 * - SEPOLIA_RPC_URL
 * - PRIVATE_KEY
 *
 * Optional env vars (if omitted, defaults are used):
 * - USDC_ADDRESS
 * - AAVE_ADDRESSES_PROVIDER
 * - AAVE_PROTOCOL_DATA_PROVIDER
 * - GAME_ENGINE
 * - DEPOSIT_START
 * - DEPOSIT_END
 * - SEASON_END
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  const now = Math.floor(Date.now() / 1000);

  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const AAVE_ADDRESSES_PROVIDER = process.env.AAVE_ADDRESSES_PROVIDER || "0x0496275d34753A48320CA58103d5220d394FF77F";
  const AAVE_PROTOCOL_DATA_PROVIDER = process.env.AAVE_PROTOCOL_DATA_PROVIDER || "0x3F78BBD206e4D3c504Eb854232EdA7e47E9Fd8FC";

  const DEPOSIT_START = process.env.DEPOSIT_START ? Number(process.env.DEPOSIT_START) : now;
  const DEPOSIT_END = process.env.DEPOSIT_END ? Number(process.env.DEPOSIT_END) : now + 3 * 24 * 60 * 60;
  const SEASON_END = process.env.SEASON_END ? Number(process.env.SEASON_END) : DEPOSIT_END + 14 * 24 * 60 * 60;

  const GAME_ENGINE = process.env.GAME_ENGINE || deployer.address;

  if (!(DEPOSIT_START < DEPOSIT_END && DEPOSIT_END < SEASON_END)) {
    throw new Error("Invalid season window: require DEPOSIT_START < DEPOSIT_END < SEASON_END");
  }

  console.log("Deploying AaveUSDCSeasonVault with:");
  console.log("deployer:", deployer.address);
  console.log("usdc:", USDC_ADDRESS);
  console.log("addressesProvider:", AAVE_ADDRESSES_PROVIDER);
  console.log("protocolDataProvider:", AAVE_PROTOCOL_DATA_PROVIDER);
  console.log("gameEngine:", GAME_ENGINE);
  console.log("depositStart:", DEPOSIT_START, new Date(DEPOSIT_START * 1000).toISOString());
  console.log("depositEnd:", DEPOSIT_END, new Date(DEPOSIT_END * 1000).toISOString());
  console.log("seasonEnd:", SEASON_END, new Date(SEASON_END * 1000).toISOString());

  const Vault = await ethers.getContractFactory("AaveUSDCSeasonVault");
  const vault = await Vault.deploy(
    USDC_ADDRESS,
    AAVE_ADDRESSES_PROVIDER,
    AAVE_PROTOCOL_DATA_PROVIDER,
    DEPOSIT_START,
    DEPOSIT_END,
    SEASON_END,
    GAME_ENGINE
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("AaveUSDCSeasonVault deployed:", vaultAddress);
  console.log("Verify reserve linkage:");
  console.log("  usdc() =>", await vault.usdc());
  console.log("  aUsdc() =>", await vault.aUsdc());
  console.log("  pool() =>", await vault.pool());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
