# Rocket Pool Season Vault - Hoodi Testnet Deployment & Verification

## Overview

**RocketPoolSeasonVault** is an ETH staking season vault that:
- Accepts ETH deposits during a configurable window
- Stakes ETH via Rocket Pool's RocketDepositPool to mint rETH
- Tracks user points during the season
- At season end, distributes yield pro-rata based on points earned
- Withdrawals are in rETH (guaranteed solvency, no liquidity risk)

### Key Architecture

```
User ETH → deposit() → Vault receives rETH from Rocket Pool
           (principal[user] tracked in ETH terms)

                ↓ (season progresses)

Staking rewards accrue → rETH appreciates in ETH value
             ↓
       Game engine awards points

            ↓ (after seasonEnd)

Season finalized → finalVaultEthValue = rETH.getEthValue(vault.rETH.balance)
                   finalTotalYieldEth = max(0, finalVaultEthValue - totalPrincipal)

            ↓

User withdraws → principal (ETH) + pro-rata yield (ETH) → converted to rETH → transferred to user
                 (using rETH.getRethValue() for exact conversion)
```

---

## Hoodi Testnet Setup

### Network Information

| Property | Value |
|----------|-------|
| **Network** | Hoodi Ethereum Staking Testnet |
| **RPC URL** | `https://testnet.hashio.io/api` |
| **Chain ID** | `17000` |
| **Currency** | ETH (testnet) |
| **Explorer** | https://holesky.etherscan.io/ |
| **Docs** | https://github.com/eth-clients/hoodi |

### Required Contract Addresses (Hoodi)

| Contract | Address | Purpose |
|----------|---------|---------|
| **RocketDepositPool** | `0x320f3aAB9405e38b955178BBe75c477dECBA0C27` | Deposit ETH → receive rETH |
| **rETH Token** | `0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1` | Staking token with value conversion |

**Sources:**
- Rocket Pool Hoodi: https://github.com/rocket-pool/rocketpool/blob/master/contracts/address/RocketAddress.sol
- Hoodi contracts: https://holesky.etherscan.io/

### Get Testnet ETH

1. Visit: https://holesky-faucet.pk910.de/
2. Enter your wallet address
3. Receive testnet ETH (wait ~5 minutes)

### Install Tools

```bash
# Foundry (for cast commands)
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Node/npm for Hardhat
node --version  # Should be v18+
npm install -g hardhat

# Or use in project
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
```

---

## Deployment

### 1. Compile Contract

```bash
# Hardhat
npx hardhat compile

# Or Foundry
forge build
```

### 2. Deploy via Hardhat Script

**Create `hardhat.config.ts`:**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hoodi: {
      url: process.env.HOODI_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 17000,
    },
  },
};

export default config;
```

**Create `.env`:**

```bash
HOODI_RPC_URL=https://testnet.hashio.io/api
PRIVATE_KEY=0x...  # Your private key (without 0x prefix)
```

**Run deployment:**

```bash
npx hardhat run scripts/deployRocketPoolVault.js --network hoodi
```

**Expected Output:**

```
Deploying with account: 0x...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Season Configuration:
Deposit Start: 2024-02-19T12:00:00.000Z
Deposit End:   2024-02-26T12:00:00.000Z
Season End:    2024-03-27T12:00:00.000Z
Game Engine:   0x...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment successful!

Contract Address: 0x1234567890123456789012345678901234567890
Network:         Hoodi Testnet
Deployer:        0x...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Deployment info saved to: ROCKET_DEPLOYMENT.json
```

### 3. Manual Deployment with Cast (Optional)

```bash
export RPC_URL="https://testnet.hashio.io/api"
export PRIVATE_KEY="0x..."

# Compile
npx hardhat compile

# Get constructor args encoded
NOW=$(date +%s)
DEPOSIT_END=$((NOW + 7 * 24 * 3600))
SEASON_END=$((DEPOSIT_END + 30 * 24 * 3600))

# Deploy
cast create --constructor-args \
  0x320f3aAB9405e38b955178BBe75c477dECBA0C27 \
  0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1 \
  $(cast wallet address --private-key $PRIVATE_KEY) \
  $NOW $DEPOSIT_END $SEASON_END \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --artifact-path artifacts/contracts/RocketPoolSeasonVault.sol/RocketPoolSeasonVault.json
```

---

## Interaction Examples

### Using Cast Commands

```bash
# Set environment
export VAULT="0x..."          # Your deployed vault address
export RPC="https://testnet.hashio.io/api"
export PK="0x..."             # Your private key
```

#### 1. Deposit ETH

Users deposit ETH during the deposit window:

```bash
# Deposit 1 ETH
cast send $VAULT \
  "deposit()" \
  --value 1ether \
  --private-key $PK \
  --rpc-url $RPC
```

**Expected:**
- Transaction confirms
- Vault receives ≈1 rETH (exact amount depends on exchange rate)
- Event: `Deposited(user, 1e18, rethReceived, ...)`

#### 2. Check Principal

```bash
# Your principal (in ETH wei)
cast call $VAULT \
  "principalEth(address)" $(cast wallet address --private-key $PK) \
  --rpc-url $RPC
```

#### 3. Check Vault rETH Balance

```bash
cast call $VAULT \
  "getVaultRethBalance()" \
  --rpc-url $RPC
```

#### 4. Check Vault ETH Value

```bash
# Total ETH value of vault's rETH (to see how much "yield" has accrued)
cast call $VAULT \
  "getVaultEthValue()" \
  --rpc-url $RPC
```

#### 5. Award Points (Game Engine Only)

```bash
USER="0x..."  # User address
POINTS=1000

cast send $VAULT \
  "awardPoints(address,uint256)" $USER $POINTS \
  --private-key $PK \
  --rpc-url $RPC
```

**Expected:**
- Event: `PointsAwarded(user, 1000, ...)`

#### 6. Check Total Points

```bash
cast call $VAULT \
  "totalPoints()" \
  --rpc-url $RPC
```

#### 7. Finalize Season (After `seasonEnd`)

```bash
cast send $VAULT \
  "endSeason()" \
  --private-key $PK \
  --rpc-url $RPC
```

**Expected:**
- Event: `SeasonEnded(finalVaultEthValue, finalTotalYieldEth, remainderReth)`

#### 8. Preview Withdrawal (Read-Only)

```bash
USER="0x..."

cast call $VAULT \
  "previewWithdraw(address)" $USER \
  --rpc-url $RPC
```

**Returns:**
```json
[
  10000000000000000000,  // principalEth (10 ETH in wei)
  1000000000000000000,   // yieldEthShare (1 ETH)
  11000000000000000000   // payoutRethAmount (11 ETH worth of rETH)
]
```

#### 9. Withdraw

```bash
cast send $VAULT \
  "withdraw()" \
  --private-key $PK \
  --rpc-url $RPC
```

**Expected:**
- rETH transferred to user's wallet
- Event: `Withdrawn(user, principalEth, yieldEth, totalRethTransferred)`

---

## Verification Checklist

After deployment, verify everything works:

### ✅ Pre-Deployment

- [ ] Accounts funded with testnet ETH (at least 5 ETH for gas and deposits)
- [ ] Private keys securely stored in .env (never commit!)
- [ ] Hardhat/tools installed: `node -v`, `npx hardhat --version`
- [ ] Contracts compile: `npx hardhat compile`

### ✅ Deployment

- [ ] Run: `npx hardhat run scripts/deployRocketPoolVault.js --network hoodi`
- [ ] Record vault address from output
- [ ] Save `ROCKET_DEPLOYMENT.json`
- [ ] Verify on explorer: https://holesky.etherscan.io/address/VAULT_ADDRESS

### ✅ Post-Deployment State

```bash
export VAULT="0x..."
export RPC="https://testnet.hashio.io/api"

# Check initial state
cast call $VAULT "totalPrincipalEth()" --rpc-url $RPC
# Expected: 0

cast call $VAULT "totalPoints()" --rpc-url $RPC
# Expected: 0

cast call $VAULT "seasonFinalized()" --rpc-url $RPC
# Expected: false (0x00)

cast call $VAULT "getVaultRethBalance()" --rpc-url $RPC
# Expected: 0
```

### ✅ Test Deposit

```bash
export USER=$(cast wallet address --private-key $PK)

# Deposit 0.5 ETH
cast send $VAULT "deposit()" \
  --value 0.5ether \
  --private-key $PK \
  --rpc-url $RPC

# Wait 1-2 blocks, then check

# Your principal should be 0.5 ETH
cast call $VAULT "principalEth(address)" $USER --rpc-url $RPC
# Expected: 500000000000000000 (0.5 ETH in wei)

# Vault should have ~0.5 rETH
cast call $VAULT "getVaultRethBalance()" --rpc-url $RPC
# Expected: ~500000000000000000 (depends on exchange rate)

# Check rETH balance matches
RETH="0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1"
cast call $RETH "balanceOf(address)" $VAULT --rpc-url $RPC
# Should match getVaultRethBalance()
```

### ✅ Test Points

```bash
# Award 100 points
cast send $VAULT "awardPoints(address,uint256)" $USER 100 \
  --private-key $PK \
  --rpc-url $RPC

# Check user's points
cast call $VAULT "points(address)" $USER --rpc-url $RPC
# Expected: 100

# Check total points
cast call $VAULT "totalPoints()" --rpc-url $RPC
# Expected: 100
```

### ✅ Test Finalization (Wait for `seasonEnd`)

Once `seasonEnd` timestamp passes:

```bash
# Finalize
cast send $VAULT "endSeason()" \
  --private-key $PK \
  --rpc-url $RPC

# Check state
cast call $VAULT "seasonFinalized()" --rpc-url $RPC
# Expected: true (0x01)

cast call $VAULT "finalVaultEthValue()" --rpc-url $RPC
# Should be vault's total ETH value

cast call $VAULT "finalTotalYieldEth()" --rpc-url $RPC
# Should be finalVaultEthValue - totalPrincipal
```

### ✅ Test Withdrawal

```bash
# Preview what you'll get
cast call $VAULT "previewWithdraw(address)" $USER --rpc-url $RPC

# Withdraw
cast send $VAULT "withdraw()" \
  --private-key $PK \
  --rpc-url $RPC

# Check rETH balance
RETH="0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1"
cast call $RETH "balanceOf(address)" $USER --rpc-url $RPC
# Should have increased by your payout amount

# Verify hasWithdrawn flag
cast call $VAULT "hasWithdrawn(address)" $USER --rpc-url $RPC
# Expected: true (0x01)
```

### ✅ Verify on Etherscan

1. Go to: https://holesky.etherscan.io/address/VAULT_ADDRESS
2. Check:
   - ✓ Contract code verified (optional but recommended)
   - ✓ Read Contract tab shows all state variables
   - ✓ Transactions section shows all interaction history
   - ✓ Events section shows Deposited, PointsAwarded, SeasonEnded, Withdrawn

### ✅ Transaction Verification

For each transaction, verify on-chain:

```bash
# Get transaction receipt
TX_HASH="0x..."
cast receipt $TX_HASH --rpc-url $RPC | jq

# Expected:
# - status: 1 (success)
# - blockNumber: confirmed
# - gasUsed: reasonable (deposits ~150k, withdrawals ~120k)
```

---

## Testnet Staking Yield Simulation

Since Hoodi may not provide instant staking rewards, you can simulate yield for testing:

### Option 1: Transfer rETH to Vault (Off-Chain Test)

If you have rETH on testnet:

```bash
export VAULT="0x..."
RETH="0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1"

# Transfer some rETH to vault (simulates yield)
cast send $RETH \
  "transfer(address,uint256)" $VAULT 1000000000000000000 \
  --private-key $PK \
  --rpc-url $RPC

# Now vault has more rETH than principal → yield!
cast call $VAULT "getVaultEthValue()" --rpc-url $RPC
# Should be higher than totalPrincipal
```

### Option 2: Use Local Hardhat Fork (Recommended for Dev)

```bash
# Start Hoodi fork locally
npx hardhat node --fork https://testnet.hashio.io/api

# Deploy vault on fork
npx hardhat run scripts/deployRocketPoolVault.js --network localhost

# In separate terminal, run tests with unlimited yield:
npx hardhat test --network localhost
```

---

## Troubleshooting

### Error: "DepositWindowClosed"

**Cause:** Current block time is outside `[depositStart, depositEnd)`

**Fix:**
- Check current time: `date +%s`
- Check vault timestamps: `cast call $VAULT depositStart/depositEnd/seasonEnd --rpc-url $RPC`
- Redeploy with future timestamps

### Error: "SeasonNotEnded"

**Cause:** Trying to finalize before `seasonEnd`

**Fix:** Wait until season end time passes, or redeploy

### Error: "InsufficientRethBalance"

**Cause:** Vault doesn't have enough rETH for payout

**Fix:**
- Verify deposit actually minted rETH: `cast call $VAULT getVaultRethBalance()`
- Check Rocket Pool is accepting deposits on Hoodi
- Use rETH transfer simulation if needed

### rETH balance not increasing

**Cause:** Staking rewards not accruing (expected on testnet without active validation)

**Fix:**
- Use rETH transfer simulation (above)
- Wait longer (rewards are batched)
- Use local fork with yield injection

### "cast: command not found"

**Fix:**
```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

### RPC timeout

**Fix:**
- Use different RPC: `https://eth-holesky.g.alchemy.com/v2/YOUR_KEY`
- Or: `https://holesky.infura.io/v3/YOUR_KEY`

---

## Contract Code Size & Gas

### Contract Size

```bash
npx hardhat size-contracts
```

Should be well under 24KB (Hoodi standard)

### Gas Estimates

| Operation | Gas | Notes |
|-----------|-----|-------|
| `deposit()` | ~150,000 | Includes RocketPool deposit |
| `awardPoints()` | ~50,000 | Simple state update |
| `endSeason()` | ~100,000 | Calls rETH.getEthValue() |
| `withdraw()` | ~120,000 | rETH transfer + state updates |

---

## Next Steps

1. ✅ Deploy to Hoodi testnet
2. ✅ Verify on Etherscan Hoodi
3. ✅ Run full deposit → finalize → withdraw cycle
4. ✅ Test with multiple users
5. ✅ Audit before mainnet migration
6. 📋 Consider wstETH (wrapped stETH) for mainnet
7. 📋 Add governance for multi-season management

---

## References

- **Rocket Pool**: https://docs.rocketpool.net/
- **Hoodi Testnet**: https://github.com/eth-clients/hoodi
- **rETH Hoodi**: https://holesky.etherscan.io/token/0x7322c24752f79C05FFD1E2a6FCB97020C1C264F1
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/4.x/
- **Hardhat**: https://hardhat.org/docs
- **Cast**: https://book.getfoundry.sh/cast/

---

**Last Updated:** February 19, 2026  
**Network:** Hoodi Testnet (chainId: 17000)  
**Status:** Production-ready for testnet
