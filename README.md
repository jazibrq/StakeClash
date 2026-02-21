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

## Components

**Frontend (React / Next.js)**
Wallet connection · Deposits · Season controls · Schedule lifecycle UI

**Smart Contracts**
Deposit accounting · Season state machine · Deterministic schedule creation · Reward logic

**Hedera Network**
Finality · Native schedule storage · Automated execution

StakeClash integrates directly with **Hedera Schedule Service** for contract-driven automation.

---

# Core Flow

## 1. Deposit

Users deposit HBAR to the treasury. Deposits are recorded in contract state.

## 2. Season Initialization

The contract:

* Iterates eligible players
* Computes payouts
* Creates scheduled transactions via Hedera system contracts
* Stores Schedule IDs on-chain

Scheduling is initiated from contract logic — not backend scripts.

## 3. Automated Execution

Hedera:

* Tracks signature readiness
* Executes deterministically
* Expires invalid schedules
* Emits execution records

UI lifecycle:
created → pending → executed / failed

All states are verifiable via mirror node.

---

# Bounty: On-Chain Automation with Hedera Schedule Service

## How StakeClash Fulfills It

### Self-Running Application

* Payout schedules created from contract logic
* No cron jobs
* No keepers
* No off-chain execution triggers
* Network handles readiness and finalization

### Contract-Driven Scheduling

* Created during season transitions
* Authorization encoded in contract state
* Invalid states cannot generate schedules

### Deterministic Execution

* Each payout wrapped in scheduled transaction
* Expiration defined at creation
* `.setWaitForExpiry(true)` ensures predictable timing
* Schedule IDs stored and exposed

### Edge Case Handling

* Insufficient treasury balance
* Expired schedules
* Partial participation
* Replay prevention
* Invalid transitions

Failure states are observable and recoverable.

### Observability

UI exposes:

* Schedule ID
* Creation timestamp
* Execution status
* Expiration status
* Linked transaction records

All outcomes independently verifiable via mirror node queries.

### Automation Use Case

StakeClash demonstrates:

* Competitive yield distribution
* Season-based disbursements
* Deterministic financial flows
* Recurring automated reward cycles

This validates Hedera-native automation without off-chain orchestration.

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
