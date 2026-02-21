StakeClash

A fast-paced, browser-based hero clash game built with React + TypeScript + Canvas, extended with on-chain automation and staking infrastructure using Hedera and Ethereum-compatible assets.

StakeClash combines:

Real-time canvas gameplay

Hero progression + skill trees

Match lifecycle orchestration

Automated on-chain reward execution

Cross-asset staking (HBAR, ETH, USDC)

Tracks & Bounties
Main Track: Etherspace — User-Owned Internet

Built on Ethereum:
Showcase · Apps · Tokenomics · Ownership · Wallets & Identity · NFTs

StakeClash fulfills this by:

Wallet-native participation (no accounts)

User custody preserved

On-chain reward logic

Cross-asset deposits (ETH / USDC)

Transparent execution and verifiable payouts

Bounty: On-Chain Automation with Hedera Schedule Service

StakeClash is a self-running financial automation system where season payouts execute deterministically without off-chain keepers or cron jobs.

It integrates directly with
Hedera Schedule Service

High-Level Architecture
┌──────────────────────────────────────────────────────────────┐
│                         StakeClash App                      │
├──────────────────────────────────────────────────────────────┤
│ Frontend (React + Canvas Engine)                           │
│ ├─ Hero Select                                              │
│ ├─ Skill Tree                                               │
│ ├─ Match Flow                                               │
│ └─ Reward Screen                                            │
├──────────────────────────────────────────────────────────────┤
│ On-Chain Integration Layer                                 │
│ ├─ Deposit Detection                                        │
│ ├─ Season Lifecycle                                         │
│ ├─ Schedule Creation                                        │
│ └─ Cross-Asset Sync (ETH / USDC)                           │
├──────────────────────────────────────────────────────────────┤
│ Hedera Network                                              │
│ ├─ Smart Contracts                                          │
│ ├─ Schedule Service                                         │
│ ├─ Native Execution Engine                                  │
│ └─ Mirror Node                                              │
├──────────────────────────────────────────────────────────────┤
│ Ethereum (Sepolia / EVM)                                   │
│ ├─ ETH Deposits                                             │
│ └─ USDC Deposits                                            │
└──────────────────────────────────────────────────────────────┘
How Scheduling Works

StakeClash uses Hedera’s native scheduling system to automate payouts.

1. Deposits

Users deposit:

HBAR → Hedera treasury

ETH → EVM treasury address

USDC → ERC-20 treasury address

All deposits are recorded in backend state and mirrored to contract state.

No payout is scheduled at deposit time.

2. Season Start

When a season begins:

For each participant:

Payout amount is calculated.

A TransferTransaction is created.

It is wrapped inside ScheduleCreateTransaction.

.setWaitForExpiry(true) is set.

Schedule ID is stored.

At this moment:

Nothing is executed.

The network stores the schedule.

Execution is delegated to Hedera.

3. Automated Execution

The Hedera network:

Waits until execution conditions are met

Verifies required signatures

Executes the transfer automatically

Emits a transaction record

Expires if not valid

There is:

No cron job

No off-chain trigger

No keeper network

No backend timing dependency

The network itself performs execution.

Cross-Asset Automation (ETH + USDC)

StakeClash supports ETH and USDC deposits while keeping Hedera as the automation engine.

Flow:

User deposits ETH or USDC (Sepolia).

Backend detects ERC-20 transfer events.

Deposit value is normalized to internal accounting.

At season start:

Hedera schedules HBAR payout.

Simultaneously, EVM payout transactions are prepared.

When Hedera scheduled execution fires:

ETH / USDC transfers are triggered in parallel using the same execution cycle.

HBAR acts as:

The deterministic automation anchor

The execution timing source

ETH / USDC piggyback on that execution lifecycle.

This allows:

Cross-chain deposits

Single deterministic payout window

Unified competitive environment

Contract-Driven Scheduling

StakeClash satisfies the bounty requirements by:

Creating schedules during season transitions

Encoding authorization rules in contract state

Storing Schedule IDs on-chain

Handling expiration natively

Exposing schedule lifecycle in UI

Lifecycle visible to user:

created → pending → executed / expired

All states verifiable via mirror node queries.

System Architecture (Game Engine)
StakeClash
├── Presentation Layer
│   ├── Clash.tsx (match flow)
│   ├── Skill Tree UI
│   ├── Rewards Screen
│   └── Search/Loading UX
│
├── Game Runtime (RaidGame.tsx)
│   ├── requestAnimationFrame loop
│   ├── Entity simulation
│   ├── Collision system
│   ├── Ability state machines
│   └── Sprite rendering
│
├── Automation Layer
│   ├── Deposit watcher
│   ├── Schedule creator
│   ├── Cross-chain handler
│   └── Mirror polling
│
└── Networks
    ├── Hedera (scheduling + execution)
    └── Ethereum (ETH / USDC deposits)
Render + Simulation Pipeline

Per frame:

Compute delta time

Update state flags

Advance entity simulation

Resolve collisions

Apply ability logic

Update animation state

Clear canvas

Draw world layers

Present frame

Tech Stack

Frontend:

React

TypeScript

HTML Canvas

Game Engine:

requestAnimationFrame simulation loop

Explicit entity state machines

Blockchain:

Hedera Testnet

Hedera Schedule Service

Solidity (EVM-compatible)

Mirror Node API

Ethereum (Sepolia)

ERC-20 (USDC)

How to Run
Install
npm install
Compile Contracts
npx hardhat compile
Start Frontend
npm run dev
Start Automation Scheduler (Required)
npm run scheduler

Scheduler must be running to:

Detect deposits

Trigger season transitions

Monitor schedule execution

Synchronize cross-chain payouts

What This Demonstrates

StakeClash proves:

Hedera can execute deterministic financial automation

Smart contracts can initiate scheduling without off-chain execution logic

Cross-asset deposits can synchronize into a unified payout cycle

High-frequency season cycles can drive repeatable transaction flows

It is both:

A real-time hero battle game

A native on-chain automation showcase
