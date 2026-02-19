#!/usr/bin/env node
/**
 * deploy-hedera.js
 * 
 * Deploys HBARSeasonVault to Hedera testnet with native staking enabled.
 * 
 * SETUP:
 *   1. npm install @hashgraph/sdk ethers dotenv
 *   2. Place compiled bytecode at ./bytecode/HBARSeasonVault.bin (hex string)
 *   3. Create .env with:
 *        OPERATOR_ID=0.0.xxxxx
 *        OPERATOR_KEY=302e020100300506...  (ED25519 private key hex)
 *        STAKED_NODE_ID=3  (optional; defaults to 3)
 *   4. Set constructor args below or via args
 * 
 * USAGE:
 *   node scripts/hedera/deploy-hedera.js
 * 
 * OUTPUT:
 *   Prints contractId and EVM address to console
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Client,
  AccountId,
  PrivateKey,
  ContractCreateTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  Hbar,
} from '@hashgraph/sdk';
import { AbiCoder, Interface } from 'ethers';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mustEnv(name) {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function getOptionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Derive Hedera EVM address from contract ID.
 * Format: 0x<entityNum as 20-byte hex>
 */
function getEvmAddressFromContractId(contractId) {
  // contractId.num is the entity number
  const entityNum = contractId.num.toNumber ? contractId.num.toNumber() : contractId.num;
  return '0x' + entityNum.toString(16).padStart(40, '0');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Deploy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('🚀 Starting HBARSeasonVault deployment to Hedera testnet...\n');

  // Load environment
  const operatorIdStr = mustEnv('OPERATOR_ID');
  const operatorKeyStr = mustEnv('OPERATOR_KEY');
  const stakedNodeId = parseInt(getOptionalEnv('STAKED_NODE_ID', '3'), 10);

  console.log(`📋 Configuration:`);
  console.log(`   Operator ID: ${operatorIdStr}`);
  console.log(`   Staked Node ID: ${stakedNodeId}`);
  console.log('');

  const operatorId = AccountId.fromString(operatorIdStr);
  const operatorKey = PrivateKey.fromStringED25519(operatorKeyStr);

  // Connect to Hedera testnet
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: Load compiled bytecode
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📖 Step 1: Loading compiled bytecode...');
    
    const bytecodePath = path.resolve(__dirname, '../../bytecode/HBARSeasonVault.bin');
    if (!fs.existsSync(bytecodePath)) {
      throw new Error(
        `Bytecode not found at ${bytecodePath}. ` +
        `Please compile HBARSeasonVault.sol and save bytecode to that path.`
      );
    }

    let bytecodeHex = fs.readFileSync(bytecodePath, 'utf8').trim();
    if (bytecodeHex.startsWith('0x')) {
      bytecodeHex = bytecodeHex.slice(2);
    }
    const bytecodeBytes = Buffer.from(bytecodeHex, 'hex');
    console.log(`   ✓ Loaded ${bytecodeBytes.length} bytes of bytecode\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: Upload bytecode as Hedera file
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 Step 2: Uploading bytecode to Hedera file system...');

    const chunkSize = 4096;
    let offset = 0;

    // Create first chunk
    const firstChunk = bytecodeBytes.slice(0, chunkSize);
    const fileCreateTx = new FileCreateTransaction()
      .setKeys([operatorKey])
      .setContents(firstChunk)
      .setMaxTransactionFee(new Hbar(2));

    const fileCreateSubmit = await fileCreateTx.execute(client);
    const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
    const fileId = fileCreateReceipt.fileId;
    console.log(`   ✓ Created file: ${fileId.toString()}`);

    offset = chunkSize;

    // Append remaining chunks
    while (offset < bytecodeBytes.length) {
      const chunk = bytecodeBytes.slice(offset, offset + chunkSize);
      const appendTx = new FileAppendTransaction()
        .setFileId(fileId)
        .setContents(chunk)
        .setMaxTransactionFee(new Hbar(2));

      const appendSubmit = await appendTx.execute(client);
      await appendSubmit.getReceipt(client);
      console.log(`   ✓ Appended chunk at offset ${offset}`);

      offset += chunkSize;
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 3: Encode constructor parameters
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔧 Step 3: Encoding constructor parameters...');

    // Constructor signature: (address, uint64, uint64, uint64)
    const constructorAbi = [
      {
        type: 'constructor',
        inputs: [
          { name: 'gameEngine', type: 'address' },
          { name: '_depositEnd', type: 'uint64' },
          { name: '_seasonStart', type: 'uint64' },
          { name: '_seasonEnd', type: 'uint64' },
        ],
      },
    ];

    // TODO: Set actual constructor parameters
    // Example values (modify as needed):
    const now = Math.floor(Date.now() / 1000);
    const gameEngineAddress = operatorIdStr.replace(/\./g, '0x');
    const depositEnd = BigInt(now + 7 * 24 * 3600); // 7 days from now
    const seasonStart = BigInt(depositEnd);
    const seasonEnd = BigInt(depositEnd + 30 * 24 * 3600); // 30-day season

    console.log(`   Game Engine: ${gameEngineAddress}`);
    console.log(`   Deposit End: ${depositEnd} (${new Date(Number(depositEnd) * 1000).toISOString()})`);
    console.log(`   Season Start: ${seasonStart}`);
    console.log(`   Season End: ${seasonEnd}`);

    const encodedParams = AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint64', 'uint64', 'uint64'],
      [gameEngineAddress, depositEnd, seasonStart, seasonEnd]
    );
    console.log(`   ✓ Encoded parameters: ${encodedParams.slice(0, 50)}...\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 4: Create contract with staking enabled
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('⚙️  Step 4: Creating contract with Hedera staking...');

    const contractCreateTx = new ContractCreateTransaction()
      .setBytecodeFileId(fileId)
      .setGas(2_000_000)
      .setConstructorParameters(Buffer.from(encodedParams.slice(2), 'hex'))
      .setStakedNodeId(stakedNodeId)
      .setDeclineStakingReward(false)
      .setMaxTransactionFee(new Hbar(10));

    const contractCreateSubmit = await contractCreateTx.execute(client);
    const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);

    const contractId = contractCreateReceipt.contractId;
    const evmAddress = getEvmAddressFromContractId(contractId);

    console.log(`   ✓ Contract created!\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Results
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('✅ Deployment successful!\n');
    console.log('═════════════════════════════════════════════════════');
    console.log(`Contract ID (Hedera):  ${contractId.toString()}`);
    console.log(`EVM Address:           ${evmAddress}`);
    console.log(`Staked Node ID:        ${stakedNodeId}`);
    console.log(`Accept Staking Reward: yes`);
    console.log('═════════════════════════════════════════════════════\n');

    console.log('📝 Next steps:');
    console.log('  1. Verify contract on Hedera testnet explorer');
    console.log('  2. Call deposit() to add HBAR to the vault');
    console.log('  3. Call addPoints() via GAME_ENGINE to award points');
    console.log('  4. After seasonEnd, call finalize()');
    console.log('  5. Users call redeem() to receive principal + yield\n');

    // Save deployment info to file
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      network: 'hedera-testnet',
      contractId: contractId.toString(),
      evmAddress,
      stakedNodeId,
      constructorParams: {
        gameEngine: gameEngineAddress,
        depositEnd: depositEnd.toString(),
        seasonStart: seasonStart.toString(),
        seasonEnd: seasonEnd.toString(),
      },
    };

    const deploymentFile = path.resolve(__dirname, '../../DEPLOYMENT.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📁 Deployment info saved to: ${deploymentFile}\n`);

  } catch (error) {
    console.error('❌ Deployment failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
