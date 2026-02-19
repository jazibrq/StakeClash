#!/usr/bin/env node
/**
 * deployRocketPoolVault.js
 * 
 * Deployment script for RocketPoolSeasonVault on Hoodi testnet
 * 
 * SETUP:
 *   1. npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
 *   2. Create .env with:
 *        HOODI_RPC_URL=https://testnet.hashio.io/api
 *        PRIVATE_KEY=0x...
 *   3. Run: npx hardhat run scripts/deployRocketPoolVault.js --network hoodi
 * 
 * Or standalone with ethers:
 *   node scripts/deployRocketPoolVault.js
 */

import 'dotenv/config';
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hoodi Testnet Addresses
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ROCKET_DEPOSIT_POOL = '0x320f3aAB9405e38b955178BBe75c477dECBA0C27';
  const RETH_TOKEN = '0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Season Timestamps
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const now = Math.floor(Date.now() / 1000);
  const DEPOSIT_START = now;                           // Starts now
  const DEPOSIT_END = now + 7 * 24 * 3600;             // 7 days
  const SEASON_END = DEPOSIT_END + 30 * 24 * 3600;     // Season ends 30 days after deposit end

  const GAME_ENGINE = deployer.address;               // Can be changed later via proposeGameEngine

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Season Configuration:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Deposit Start:', new Date(DEPOSIT_START * 1000).toISOString());
  console.log('Deposit End:  ', new Date(DEPOSIT_END * 1000).toISOString());
  console.log('Season End:   ', new Date(SEASON_END * 1000).toISOString());
  console.log('Game Engine:  ', GAME_ENGINE);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Deploy Contract
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('Compiling RocketPoolSeasonVault...');
  const RocketPoolSeasonVault = await ethers.getContractFactory('RocketPoolSeasonVault');

  console.log('Deploying contract...');
  const vault = await RocketPoolSeasonVault.deploy(
    ROCKET_DEPOSIT_POOL,
    RETH_TOKEN,
    GAME_ENGINE,
    DEPOSIT_START,
    DEPOSIT_END,
    SEASON_END
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log('✅ Deployment successful!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Contract Address:', vaultAddress);
  console.log('Network:         Hoodi Testnet');
  console.log('Deployer:        ', deployer.address);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Save Deployment Info
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: 'hoodi-testnet',
    contractAddress: vaultAddress,
    rocketDepositPool: ROCKET_DEPOSIT_POOL,
    rethToken: RETH_TOKEN,
    gameEngine: GAME_ENGINE,
    seasonConfig: {
      depositStart: DEPOSIT_START,
      depositEnd: DEPOSIT_END,
      seasonEnd: SEASON_END,
      depositStartIso: new Date(DEPOSIT_START * 1000).toISOString(),
      depositEndIso: new Date(DEPOSIT_END * 1000).toISOString(),
      seasonEndIso: new Date(SEASON_END * 1000).toISOString(),
    },
    deployer: deployer.address,
  };

  // Write to file
  const fs = await import('fs');
  const path = await import('path');
  const deploymentFile = path.resolve('ROCKET_DEPLOYMENT.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('📝 Deployment info saved to: ROCKET_DEPLOYMENT.json\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Next Steps
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('🎯 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Verify on Etherscan Hoodi:');
  console.log(`   https://holesky.etherscan.io/address/${vaultAddress}`);
  console.log('');
  console.log('2. Test deposit (from command line with cast):');
  console.log(`   cast send ${vaultAddress} "deposit()" --value 1ether --rpc-url https://testnet.hashio.io/api`);
  console.log('');
  console.log('3. Check rETH balance:');
  console.log(`   cast call ${vaultAddress} "getVaultRethBalance()" --rpc-url https://testnet.hashio.io/api`);
  console.log('');
  console.log('4. Award points (game engine only):');
  console.log(`   cast send ${vaultAddress} "awardPoints(address,uint256)" <USER> <POINTS> --rpc-url https://testnet.hashio.io/api`);
  console.log('');
  console.log('5. Finalize season (after seasonEnd):');
  console.log(`   cast send ${vaultAddress} "endSeason()" --rpc-url https://testnet.hashio.io/api`);
  console.log('');
  console.log('6. Withdraw:');
  console.log(`   cast send ${vaultAddress} "withdraw()" --rpc-url https://testnet.hashio.io/api`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((error) => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
