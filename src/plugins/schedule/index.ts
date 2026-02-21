/**
 * src/plugins/schedule/index.ts
 *
 * Single entry point for all Hedera scheduled-transaction logic.
 *
 * Handlers (create / status / watch) use the same CommandHandlerArgs
 * interface as hiero-ledger/hiero-cli — making them usable in both this
 * project and as a PR to the official Hiero CLI repo.
 *
 * For StakeClash: use `buildHandlerArgs` (adapter) to wrap the env-var
 * Hedera Client before calling a handler.
 */

export * as create from "./commands/create";
export * as status from "./commands/status";
export * as watch  from "./commands/watch";

// Adapter: wraps a raw Hedera Client as CommandHandlerArgs
export { buildHandlerArgs } from "./adapter";
