# StakeClash

On-chain competitive staking powered by Hedera.

StakeClash is a decentralized application where users deposit assets, compete in yield-based seasons, and receive automated payouts. All delayed execution and payout automation are handled on-chain through Hedera system contracts.

---

# Main Track: Etherspace

User-Owned Internet
Built on Ethereum — Showcase · Apps · Tokenomics · Art · Ownership Structures · Wallets & Identity · Mainstream Adoption · Social · NFTs

StakeClash enables:

* Wallet-native participation
* Verifiable reward execution
* Non-custodial interaction
* Smart contract–encoded competitive mechanics

---

# Architecture

```
+---------------------+
|        USER         |
+---------------------+
           |
           v
+---------------------+
|     FRONTEND        |
|  (React / Next.js)  |
|---------------------|
| - Deposit UI        |
| - Season Controls   |
| - Schedule Status   |
+---------------------+
           |
           v
+---------------------+
|       WALLET        |
|  (EVM Compatible)   |
|---------------------|
| - Sign Transactions |
| - Auth              |
+---------------------+
           |
           v
+---------------------+
|   SMART CONTRACTS   |
| (Solidity on EVM)   |
|---------------------|
| - Deposit Logic     |
| - Season Engine     |
| - Payout Calc       |
| - Schedule Creation |
+---------------------+
           |
           v
+------------------------------+
|        HEDERA NETWORK        |
|------------------------------|
| - Finality                   |
| - Native Schedule Storage    |
| - Automated Execution Engine |
| - Expiration Handling        |
+------------------------------+
           |
           v
+---------------------+
|     MIRROR NODE     |
|---------------------|
| - Schedule Status   |
| - Tx Records        |
| - UI Sync           |
+---------------------+
           |
           v
+---------------------+
|     FRONTEND UI     |
|---------------------|
| created             |
| pending             |
| executed / failed   |
+---------------------+
```

StakeClash integrates directly with **Hedera Schedule Service** for contract-driven automation.

---

# Core Flow

1. **Deposit**
   User deposits HBAR. Deposit is recorded in contract state.

2. **Season Initialization**
   Contract:

   * Iterates eligible players
   * Computes payouts
   * Creates scheduled transactions
   * Stores Schedule IDs

   Scheduling is initiated from contract logic — not backend scripts.

3. **Automated Execution**
   Hedera:

   * Tracks readiness
   * Executes deterministically
   * Expires invalid schedules
   * Emits execution records

All lifecycle states are verifiable via mirror node queries.

---

# Bounty: On-Chain Automation with Hedera Schedule Service

## How StakeClash Fulfills It

**Self-Running Application**

* Payout schedules created from contract logic
* No cron jobs
* No keeper bots
* No off-chain execution triggers

**Contract-Driven Scheduling**

* Triggered during season transitions
* Authorization enforced in contract state
* Invalid states cannot generate schedules

**Deterministic Execution**

* Each payout wrapped in scheduled transaction
* Expiration defined at creation
* `.setWaitForExpiry(true)` ensures predictable timing
* Schedule IDs stored and exposed

**Edge Case Handling**

* Insufficient treasury balance
* Expired schedules
* Partial participation
* Replay prevention
* Invalid transitions

**Observability**

* Schedule ID
* Creation timestamp
* Execution status
* Expiration status
* Linked transaction records

All outcomes independently verifiable via mirror node.

---

# Tech Stack

Hedera Testnet · Hedera Schedule Service System Contracts · Solidity (EVM) · TypeScript backend (monitoring + mirror polling) · React / Next.js

---

# Local Setup

```bash
git clone https://github.com/jazibrq/StakeClash.git
cd StakeClash
npm install
npx hardhat compile
npm run dev
npm run scheduler
```

StakeClash demonstrates contract-initiated scheduling, automated payout execution, and full lifecycle observability using Hedera’s native scheduling infrastructure.
