# StakeClash

Browser-based hero clash game built with **React + TypeScript + Canvas** integrated with **Hedera-native on-chain automation** and **ETH / USDC deposits**.

---

# Tracks

## Main Track: Etherspace — User-Owned Internet

StakeClash provides:

* Wallet-based participation
* Non-custodial deposits
* On-chain reward execution
* Cross-asset staking (HBAR, ETH, USDC)

---

## Bounty: On-Chain Automation with Hedera Schedule Service

StakeClash executes season payouts using Hedera-native scheduling.

* No cron jobs
* No keeper bots
* No off-chain execution triggers
* Scheduling initiated from controlled logic
* Lifecycle fully observable

---

# Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         StakeClash                           │
├──────────────────────────────────────────────────────────────┤
│ Frontend (React + Canvas)                                    │
│ ├─ Hero Select                                               │
│ ├─ Skill Tree                                                │
│ ├─ Match Flow                                                │
│ └─ Rewards Screen                                            │
├──────────────────────────────────────────────────────────────┤
│ Automation Layer                                             │
│ ├─ Deposit Detection                                         │
│ ├─ Season Lifecycle                                          │
│ ├─ Schedule Creation                                         │
│ ├─ Cross-Asset Sync (ETH / USDC)                             │
│ └─ Mirror Polling                                            │
├──────────────────────────────────────────────────────────────┤
│ Hedera Network                                               │
│ ├─ Smart Contracts                                           │
│ ├─ Schedule Service                                          │
│ ├─ Native Execution Engine                                   │
│ └─ Mirror Node                                               │
├──────────────────────────────────────────────────────────────┤
│ Ethereum (Sepolia)                                           │
│ ├─ ETH Deposits                                              │
│ └─ USDC Deposits                                             │
└──────────────────────────────────────────────────────────────┘
```

---

# Scheduling Model

## Deposits

Users deposit:

* HBAR → Hedera treasury
* ETH → EVM treasury
* USDC → ERC-20 treasury

Deposits are detected and recorded.
No payout is scheduled at deposit time.

---

## Season Start

When a season begins:

For each participant:

1. Compute payout
2. Create `TransferTransaction`
3. Wrap in `ScheduleCreateTransaction`
4. Call `.setWaitForExpiry(true)`
5. Store Schedule ID

Execution is not immediate.
The schedule is stored on Hedera.

---

## Automated Execution

Hedera:

* Tracks required signatures
* Executes at readiness/expiry
* Emits transaction record
* Expires invalid schedules

Execution timing is network-controlled.

---

# Cross-Asset Flow (ETH / USDC)

1. User deposits ETH or USDC on Sepolia
2. Backend listens to transfer events
3. Deposit normalized into internal accounting
4. Season start:

   * Hedera schedules HBAR payout
   * ETH / USDC payout transactions prepared
5. When Hedera schedule executes:

   * ETH / USDC transfers executed in same payout cycle

HBAR acts as execution anchor.
ETH / USDC follow the same deterministic payout window.

---

# Game Runtime Architecture

```
StakeClash
├── Presentation Layer
│   ├── Clash.tsx (match flow)
│   ├── Skill Tree UI
│   ├── Search / Loading
│   └── Rewards Screen
│
├── Game Engine (RaidGame.tsx)
│   ├── requestAnimationFrame loop
│   ├── Entity simulation
│   ├── Collision system
│   ├── Ability state machines
│   └── Sprite rendering
│
├── Automation Backend
│   ├── Deposit watcher
│   ├── Schedule creator
│   ├── Cross-chain handler
│   └── Mirror polling
│
└── Networks
    ├── Hedera
    └── Ethereum
```

---

# Tech Stack

Frontend:

* React
* TypeScript
* HTML Canvas

Blockchain:

* Hedera Testnet
* Hedera Schedule Service
* Solidity (EVM-compatible)
* Mirror Node API
* Ethereum (Sepolia)
* ERC-20 (USDC)

---

# Run Locally

Install:

```
npm install
```

Compile contracts:

```
npx hardhat compile
```

Start frontend:

```
npm run dev
```

Start scheduler (required):

```
npm run scheduler
```

Scheduler handles:

* Deposit detection
* Schedule monitoring
* Season execution
* Cross-chain synchronization
