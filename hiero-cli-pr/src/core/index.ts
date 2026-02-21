/**
 * hiero-cli-pr/src/core/index.ts
 *
 * Minimal type stubs that mirror the real hiero-ledger/hiero-cli core surface.
 * These types are already present in the target repo — this file exists so that
 * the plugin source and tests compile correctly when the PR folder is open in an
 * IDE without the full hiero-cli repo context.
 */

import type { TxExecutionService } from './services/tx-execution/tx-execution-service.interface';

// ── Logger ────────────────────────────────────────────────────────────────────

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ── Network API ───────────────────────────────────────────────────────────────

export interface NetworkConfig {
  mirrorNodeUrl: string;
  rpcUrl?: string;
}

export interface OperatorInfo {
  accountId: string;
  keyRefId: string;
}

export interface NetworkApi {
  getCurrentNetwork(): string;
  getCurrentOperatorOrThrow(): OperatorInfo;
  getNetworkConfig(network: string): NetworkConfig;
}

// ── Plugin API (the object passed to every command handler) ───────────────────

export interface PluginApi {
  network: NetworkApi;
  txExecution: TxExecutionService;
  /** Additional services may be present; allow arbitrary extension. */
  [key: string]: unknown;
}

// ── State / Config (opaque bags passed through from CLI core) ─────────────────

export type StateStore = Record<string, unknown>;
export type ConfigStore = Record<string, unknown>;

// ── The single argument object received by every command handler ──────────────

export interface CommandHandlerArgs {
  /** Parsed CLI / programmatic arguments for this command invocation. */
  args: Record<string, unknown>;

  /** Services injected by the CLI core. */
  api: PluginApi;

  /** Structured logger. */
  logger: Logger;

  /** Mutable session state shared across commands. */
  state: StateStore;

  /** Read-only config loaded from the user's config file. */
  config: ConfigStore;
}

// ── The return type of every command handler ──────────────────────────────────

export interface CommandExecutionResult {
  /** Overall outcome of the command. */
  status: 'success' | 'failure';

  /**
   * JSON-stringified structured output.
   * Present when status === 'success'.
   */
  outputJson?: string;

  /**
   * Human-readable error description.
   * Present when status === 'failure'.
   */
  errorMessage?: string;
}
