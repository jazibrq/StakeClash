# PR: Add `schedule` plugin — Hedera scheduled-transaction management

## Summary

This PR adds a new **`schedule`** plugin to the Hiero CLI that covers the full lifecycle of [Hedera Scheduled Transactions](https://docs.hedera.com/hedera/sdks-and-apis/sdks/schedule-transaction).

| Command | What it does |
|---|---|
| `schedule:create` | Wraps an HBAR transfer in a `ScheduleCreateTransaction` and submits it |
| `schedule:status` | Queries the mirror node for the current state of a schedule |
| `schedule:watch` | Polls the mirror node until the schedule reaches a terminal state (EXECUTED / DELETED) |

## Motivation

Scheduled transactions are a core Hedera primitive that allow accounts to pre-authorise future transfers. No existing plugin covers this workflow.

## Files changed

### Core (new field)

| File | Change |
|---|---|
| `src/core/services/tx-execution/tx-execution-service.interface.ts` | `scheduleId?: string` added to `TransactionResult` **and** `TransactionReceipt` |
| `src/core/services/tx-execution/tx-execution-service.ts` | `processTransactionResponse` now extracts `receipt.scheduleId?.toString()` |

### New plugin

```
src/plugins/schedule/
├── manifest.ts
├── index.ts
├── commands/
│   ├── create/
│   │   ├── input.ts
│   │   ├── output.ts
│   │   ├── handler.ts
│   │   └── index.ts
│   ├── status/
│   │   ├── input.ts, output.ts, handler.ts, index.ts
│   └── watch/
│       ├── input.ts, output.ts, handler.ts, index.ts
└── __tests__/unit/
    ├── create.test.ts
    ├── status.test.ts
    └── watch.test.ts
```

## How to apply

Copy the folders from this directory into the root of your `hiero-ledger/hiero-cli` fork,
then apply the two-line change to `tx-execution-service.ts` described in `CORE_DIFF.md`.

## Testing

```bash
# From the hiero-cli repo root
npx jest src/plugins/schedule --coverage
```

All 3 test suites pass (create, status, watch).
