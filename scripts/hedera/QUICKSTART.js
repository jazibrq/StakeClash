#!/usr/bin/env node

/**
 * QUICK START: HBARSeasonVault Deployment
 * 
 * This file contains all the steps needed to deploy the contract.
 * Run: node scripts/hedera/QUICKSTART.js
 */

import fs from 'node:fs';
import path from 'node:path';

const steps = [
  {
    number: 1,
    title: 'Install Dependencies',
    details: [
      '$ npm install',
      '',
      'This installs:',
      '  - @hashgraph/sdk       (Hedera SDK for Node.js)',
      '  - ethers               (For ABI encoding)',
      '  - dotenv               (For .env file support)',
    ],
  },
  {
    number: 2,
    title: 'Set Up Environment Variables',
    details: [
      '$ cp .env.example .env',
      '$ nano .env',
      '',
      'Fill in:',
      '  OPERATOR_ID=0.0.xxxxx       (Your Hedera account)',
      '  OPERATOR_KEY=302e020100...  (Your ED25519 private key in hex)',
      '  STAKED_NODE_ID=3            (Optional; defaults to 3)',
      '',
      'Get OPERATOR_ID and KEY from: https://portal.hedera.com/',
    ],
  },
  {
    number: 3,
    title: 'Compile Solidity Contract',
    details: [
      'Option A: Using Hardhat',
      '  $ npx hardhat compile',
      '  $ cp artifacts/contracts/HBARSeasonVault.sol/HBARSeasonVault.json ./bytecode/',
      '',
      'Option B: Using Solc',
      '  $ solc --bin contracts/HBARSeasonVault.sol -o bytecode/',
      '',
      'Result: ./bytecode/HBARSeasonVault.bin (hex bytecode)',
    ],
  },
  {
    number: 4,
    title: 'Deploy to Hedera Testnet',
    details: [
      '$ npm run deploy:hedera',
      '',
      'You will see:',
      '  - 📖 Bytecode upload',
      '  - 🔧 Constructor encoding',
      '  - ⚙️  Contract creation with staking enabled',
      '',
      'Output:',
      '  Contract ID (Hedera):  0.0.654321',
      '  EVM Address:           0x000000000a0002',
      '  DEPLOYMENT.json        (saved with full details)',
    ],
  },
  {
    number: 5,
    title: 'Run Tests (Optional)',
    details: [
      '$ node scripts/hedera/test-vault-logic.js',
      '',
      'This validates 16 core scenarios:',
      '  ✅ Deposit validation',
      '  ✅ Points award validation',
      '  ✅ Finalization logic',
      '  ✅ Yield distribution (pro-rata)',
      '  ✅ Edge cases (no points, double redeem, etc.)',
      '  ✅ Multi-user complex scenario',
    ],
  },
  {
    number: 6,
    title: 'Verify Deployment',
    details: [
      'Check DEPLOYMENT.json:',
      '  $ cat DEPLOYMENT.json',
      '',
      'Verify on explorer:',
      '  https://testnet.hashscan.io/contract/0.0.xxxxx',
      '',
      'Verify staking enabled:',
      '  curl https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.xxxxx',
      '  Look for: "staked_node_id": 3, "decline_reward": false',
    ],
  },
];

function printStep(step) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`${step.number}. ${step.title}`);
  console.log(`${'═'.repeat(70)}\n`);
  step.details.forEach((line) => console.log(line));
}

function main() {
  console.log('\n');
  console.log(`${'█'.repeat(70)}`);
  console.log('   🚀  HEDERA HBAR SEASON VAULT - QUICK START GUIDE');
  console.log(`${'█'.repeat(70)}`);

  steps.forEach(printStep);

  console.log(`\n${'═'.repeat(70)}`);
  console.log('🎯 NEXT STEPS');
  console.log(`${'═'.repeat(70)}\n`);

  console.log(
    `Once deployed, users can:
  1. Call deposit() to add HBAR to the vault
  2. Game engine calls addPoints() to award points
  3. After seasonEnd, call finalize() to snapshot yield
  4. Users call redeem() to receive principal + pro-rata yield

For full documentation, see: HEDERA_VAULT_README.md
For examples, see: scripts/hedera/

Happy staking! 🎉\n`
  );
}

main();
