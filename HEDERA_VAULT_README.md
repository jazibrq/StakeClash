# Hedera HBAR Season Vault

A Solidity smart contract for Hedera testnet that enables seasonal staking of HBAR with points-based yield distribution.

## Overview

**HBARSeasonVault** is a contract that:

1. **Accepts HBAR deposits** during a deposit window
2. **Awards points** to users during a season (based on game engine calls)
3. **Earns staking rewards** from Hedera's native account staking
4. **Distributes yield** pro-rata to users based on their points

### Key Features

- ✅ Native Hedera staking (staking rewards auto-accrue to contract balance)
- ✅ Points-based yield distribution (yield goes to active players)
- ✅ Reentrancy guard (safe from attacks)
- ✅ Time-window enforcement (deposits, seasons, redemption phases)
- ✅ Zero-drift accounting (transparent math)

### Edge Cases Handled

- **No deposits**: Redeem returns 0
- **No points earned**: Yield remains in contract (not distributed)
- **Balance insufficient**: Revert with `InsufficientContractBalance`

---

## Architecture

### Contract Phases

```
DEPOSIT PHASE          SEASON PHASE              FINALIZATION
┌──────────────┐      ┌─────────────────┐      ┌─────────┐
│ Users call   │      │ Game engine     │      │ finalize│
│ deposit()    │  →   │ calls addPoints │  →   │ called  │
│ until        │      │ until seasonEnd │      │ after   │
│ depositEnd   │      │                 │      │ seasonEnd
└──────────────┘      └─────────────────┘      └─────────┘
                             ↓
                    Staking rewards
                    accumulate here
                             ↓
                      snapshots yield
                             ↓
                   REDEMPTION PHASE
                   ┌─────────────────┐
                   │ Users call      │
                   │ redeem()        │
                   │ get principal   │
                   │ + pro-rata yield│
                   └─────────────────┘
```

### State Variables

```solidity
// Configuration (immutable)
address GAME_ENGINE           // Only address that can call addPoints()
uint64 depositEnd             // Deadline for deposits
uint64 seasonStart            // When points can first be earned
uint64 seasonEnd              // When season closes & finalize() can run

// Principal tracking
mapping(address => uint256) principal  // How much each user deposited
uint256 totalPrincipal                 // Sum of all deposits

// Points tracking
mapping(address => uint256) points     // Points earned per user
uint256 totalPoints                    // Total points in the system

// Finalization
bool finalized                         // Has finalize() been called?
uint256 totalYieldSnapshot             // Yield captured at finalization

// Redemption
mapping(address => bool) redeemed      // Has user already redeemed?
```

---

## Deployment

### Prerequisites

```bash
# Install dependencies
npm install

# Required environment variables
export OPERATOR_ID="0.0.xxxxx"          # Your Hedera account
export OPERATOR_KEY="302e020100..."     # ED25519 private key (hex)
export STAKED_NODE_ID="3"               # Optional (defaults to 3)
```

### Compile Contract

Using Hardhat or Solc:

```bash
# Option 1: Hardhat
npx hardhat compile
# Output: artifact/HBARSeasonVault.json

# Option 2: Solc directly
solc --bin contracts/HBARSeasonVault.sol -o bytecode/

# Copy bytecode to deployment directory
cp bytecode/HBARSeasonVault.bin bytecode/HBARSeasonVault.bin
```

### Run Deployment

```bash
npm run deploy:hedera
```

### Expected Output

```
🚀 Starting HBARSeasonVault deployment to Hedera testnet...

📋 Configuration:
   Operator ID: 0.0.xxxxx
   Staked Node ID: 3

📖 Step 1: Loading compiled bytecode...
   ✓ Loaded 2048 bytes of bytecode

📤 Step 2: Uploading bytecode to Hedera file system...
   ✓ Created file: 0.0.123456
   ✓ Appended chunk at offset 4096

🔧 Step 3: Encoding constructor parameters...
   Game Engine: 0x000000000000000000000000000000xxxxx
   Deposit End: 1708392000 (2024-02-19T15:00:00Z)
   Season Start: 1708392000
   Season End: 1710984000

⚙️  Step 4: Creating contract with Hedera staking...
   ✓ Contract created!

✅ Deployment successful!

═════════════════════════════════════════════════════
Contract ID (Hedera):  0.0.654321
EVM Address:           0x000000000a0002
Staked Node ID:        3
Accept Staking Reward: yes
═════════════════════════════════════════════════════

📁 Deployment info saved to: DEPLOYMENT.json
```

---

## Usage

### 1. Deposit HBAR

Before `depositEnd`, users call:

```javascript
// Via Hedera SDK
const contractId = ContractId.fromString('0.0.654321');
const depositAmount = new Hbar(10); // Deposit 10 HBAR

const tx = new ContractExecuteTransaction()
  .setContractId(contractId)
  .setFunction('deposit')
  .setGas(100_000)
  .setPayableAmount(depositAmount);

const receipt = await tx.execute(client).getReceipt(client);
```

Or via Web3 (ethers.js):

```javascript
const contract = new ethers.Contract(
  '0x000000000a0002',
  ABI,
  signer
);

await contract.deposit({ value: ethers.parseEther('10') });
```

### 2. Game Engine Awards Points

Between `seasonStart` and `seasonEnd`, game engine calls:

```javascript
const tx = new ContractExecuteTransaction()
  .setContractId(contractId)
  .setFunction('addPoints', new ContractFunctionParameters()
    .addAddress(userAddress)
    .addUint256(100))
  .setGas(100_000);

await tx.execute(client).getReceipt(client);
```

### 3. Finalize Season

After `seasonEnd`, anyone can call:

```javascript
const tx = new ContractExecuteTransaction()
  .setContractId(contractId)
  .setFunction('finalize')
  .setGas(200_000);

await tx.execute(client).getReceipt(client);
```

This snapshots:
- Total contract balance (principal + staking rewards)
- Yield = max(0, balance - totalPrincipal)

### 4. Redeem Payout

After finalization, users call:

```javascript
const tx = new ContractExecuteTransaction()
  .setContractId(contractId)
  .setFunction('redeem')
  .setGas(150_000);

const receipt = await tx.execute(client).getReceipt(client);
```

User receives:
$$\text{payout} = \text{principal} + \frac{\text{totalYield} \times \text{userPoints}}{\text{totalPoints}}$$

---

## Testing

### Run Logic Tests

```bash
node scripts/hedera/test-vault-logic.js
```

Tests cover:
- ✅ Deposit validation (time windows, zero amounts)
- ✅ Points phase (season boundaries)
- ✅ Finalization (state transitions)
- ✅ Redemption & yield distribution
- ✅ Edge cases (totalPoints == 0, double redeem, etc.)
- ✅ Complex multi-user scenarios

### Expected Output

```
🧪 HBARSeasonVault Logic Tests

📝 Test Group 1: Deposit Phase
✅ Deposit before window closes
✅ Reject zero deposit
✅ Reject deposit after window closes

[... 13 more tests ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Example Usage Flow

### 1. Setup

```javascript
// Contract deployed for 7-day deposits, 30-day season
// Now: 2024-02-19
// Deposit Deadline: 2024-02-26
// Season: 2024-02-26 → 2024-03-27
```

### 2. Day 1-7: Deposit Phase

```
Alice deposits 10 HBAR → principal['alice'] = 10
Bob deposits 5 HBAR   → principal['bob'] = 5
```

### 3. Day 8-37: Season Phase

```
Day 10: Game engine awards 100 points to Alice → points['alice'] = 100
Day 15: Game engine awards 200 points to Bob   → points['bob'] = 200
Day 27: Hedera staking rewards accrue: +0.8 HBAR (8% APY over 30 days)

Contract balance at day 37:
  = 10 + 5 + 0.8 = 15.8 HBAR
```

### 4. Day 38+: Finalization

```
finalize() is called:
  totalAssets = 15.8 HBAR
  totalPrincipal = 15 HBAR
  totalYield = 0.8 HBAR
  totalYieldSnapshot = 0.8 HBAR
```

### 5. Redemption

```
Alice calls redeem():
  aliceYield = 0.8 * (100 / 300) ≈ 0.267 HBAR
  alicePayout = 10 + 0.267 = 10.267 HBAR

Bob calls redeem():
  bobYield = 0.8 * (200 / 300) ≈ 0.533 HBAR
  bobPayout = 5 + 0.533 = 5.533 HBAR

Total redeemed: 10.267 + 5.533 = 15.8 HBAR ✅
```

---

## Staking Configuration

### How Hedera Staking Works

1. **Contract account is staked** to a node (via `setStakedNodeId` at deployment)
2. **Rewards are earned automatically** when the contract account is involved in transactions
3. **Rewards are transferred** from Hedera's reward account (0.0.800)
4. **No lockup or slashing** — rewards are yours to keep

### Verifying Staking Status

Use Hedera API:

```bash
curl https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.654321
```

Look for:
```json
{
  "staked_node_id": 3,
  "decline_reward": false
}
```

### Maximize Rewards

- **Make frequent contract calls** → More transactions = more reward opportunities
- **Keep contract funded** → All balance is staked automatically
- **Use low-gas operations** → Cheaper calls = more calls possible

---

## Security Considerations

### Reentrancy

✅ Protected by `nonReentrant` guard on `deposit()`, `finalize()`, and `redeem()`

### Time Windows

✅ All phases are strictly time-gated:
- Deposits only before `depositEnd`
- Points only between `seasonStart` and `seasonEnd`
- Finalization only after `seasonEnd`

### Principal Safety

✅ Principal amounts are never touched except at redemption
✅ No flash loans or temporary borrowing

### Yield Integrity

✅ Yield is calculated exactly once at finalization
✅ Pro-rata distribution is deterministic (no rounding errors)

---

## File Structure

```
/home/jazibrq/Documents/StakeClash/
├── contracts/
│   └── HBARSeasonVault.sol          # Main contract
├── scripts/hedera/
│   ├── deploy-hedera.js             # Deployment script
│   └── test-vault-logic.js          # Logic tests
├── bytecode/
│   └── HBARSeasonVault.bin          # Compiled contract (add after compile)
├── DEPLOYMENT.json                  # Output from deployment
└── package.json                     # Dependencies
```

---

## Troubleshooting

### Error: "Missing env var OPERATOR_ID"

```bash
# Add to .env file (git-ignored)
OPERATOR_ID=0.0.123456
OPERATOR_KEY=302e020100...
```

### Error: "Bytecode not found"

```bash
# Compile contract first
npx hardhat compile
cp artifacts/contracts/HBARSeasonVault.sol/HBARSeasonVault.json bytecode/HBARSeasonVault.bin
```

### Error: "DepositClosed"

The deposit window has passed. Contract is now in the season phase.

### Error: "SeasonNotEnded"

Wait until `seasonEnd` timestamp before calling `finalize()`.

### Error: "AlreadyRedeemed"

User has already called `redeem()`. Each user can redeem only once.

---

## Next Steps

1. ✅ Deploy to Hedera testnet: `npm run deploy:hedera`
2. 🎮 Integrate game engine to call `addPoints()`
3. 💳 Create UI for users to `deposit()` and `redeem()`
4. 📊 Monitor staking rewards via Hedera API
5. 📈 Audit before mainnet migration

---

## Support

For issues or questions:

1. Check the [Hedera documentation](https://docs.hedera.com/)
2. Review test cases in `test-vault-logic.js`
3. Inspect contract state via [Hedera Testnet Explorer](https://testnet.hashscan.io/)

---

**Version**: 1.0.0  
**License**: MIT  
**Network**: Hedera Testnet  
**Last Updated**: 2026-02-19
