/**
 * StakeClash → Schedule Plugin Adapter
 *
 * The schedule plugin handlers (create / status / watch) expect a
 * CommandHandlerArgs object — the same interface the Hiero CLI core injects.
 *
 * This adapter builds that object from StakeClash's env-var Hedera Client
 * so autoScheduler.ts can call the plugin handlers directly, without the
 * full Hiero CLI framework.
 *
 * Result: the Hedera scheduling logic lives in ONE place (the plugin handlers)
 * and both StakeClash and any hiero-cli fork use identical code.
 */
import {
  AccountId,
  Transaction,
} from '@hashgraph/sdk';

import type { CommandHandlerArgs, Logger } from '@/core';

/**
 * Minimal interface for a Hedera client — avoids import conflicts when two
 * copies of @hashgraph/sdk exist (e.g. workspace root vs sub-package).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HederaClientLike = any;

// ── Return type of signAndExecute — mirrors TransactionResult ─────────────

export interface AdapterTransactionResult {
  success: boolean;
  transactionId: string;
  scheduleId?: string;
  consensusTimestamp: string;
  receipt: { status: { status: string; transactionId: string } };
}

/**
 * Wraps a live Hedera Client so it satisfies the api.txExecution interface
 * the plugin handlers expect.
 *
 * signAndExecute:
 *   - freezes the transaction against the client
 *   - executes it
 *   - reads the receipt
 *   - extracts scheduleId (important for create) and returns a flat result
 */
function buildTxExecution(client: HederaClientLike) {
  return {
    async signAndExecute(tx: Transaction): Promise<AdapterTransactionResult> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (tx as any).execute(client) as any;
      const receipt  = await response.getReceipt(client) as any;

      return {
        success:            receipt.status._code === 22, // Status.Success._code
        transactionId:      response.transactionId?.toString() ?? '',
        scheduleId:         receipt.scheduleId?.toString(),
        consensusTimestamp: new Date().toISOString(),    // approximate; not from record
        receipt: {
          status: {
            status:        receipt.status._code === 22 ? 'success' : 'failed',
            transactionId: response.transactionId?.toString() ?? '',
          },
        },
      };
    },
  };
}

/**
 * Build a full CommandHandlerArgs from StakeClash env/config values.
 *
 * @param client       Hedera client with operator already set
 * @param operatorId   Operator / treasury account ID
 * @param network      "testnet" | "mainnet" | "previewnet"
 * @param mirrorBase   Mirror node base URL (no trailing slash)
 * @param handlerArgs  The args object to forward to the handler (field values)
 * @param logger       Optional custom logger; defaults to console
 */
export function buildHandlerArgs(
  client: HederaClientLike,
  operatorId: AccountId,
  network: string,
  mirrorBase: string,
  handlerArgs: Record<string, unknown>,
  logger?: Partial<Logger>,
): CommandHandlerArgs {
  const log: Logger = {
    info:  (m) => console.log(m),
    debug: (m) => console.log(m),
    warn:  (m) => console.warn(m),
    error: (m) => console.error(m),
    ...logger,
  };

  return {
    args: handlerArgs,
    logger: log,
    state: {},
    config: {},
    api: {
      txExecution: buildTxExecution(client),
      network: {
        getCurrentNetwork:       () => network,
        getCurrentOperatorOrThrow: () => ({
          accountId: operatorId.toString(),
          keyRefId: 'operator',
        }),
        getNetworkConfig: (_net: string) => ({ mirrorNodeUrl: mirrorBase }),
      },
    },
  };
}
