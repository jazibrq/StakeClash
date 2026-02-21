/**
 * Minimal Hiero CLI core types — enough to run the schedule plugin inside
 * StakeClash WITHOUT having the full hiero-cli package installed.
 *
 * These mirror the exact same interfaces in hiero-ledger/hiero-cli so the
 * plugin handlers can be copied verbatim into either project.
 */

export interface Logger {
  info(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface CommandExecutionResult {
  status: 'success' | 'failure';
  errorMessage?: string;
  outputJson?: string;
}

/** The subset of CoreApi that the schedule plugin actually uses. */
export interface SchedulePluginApi {
  txExecution: {
    signAndExecute(tx: import('@hashgraph/sdk').Transaction): Promise<{
      success: boolean;
      transactionId: string;
      scheduleId?: string;
      consensusTimestamp: string;
      receipt: { status: { status: string; transactionId: string } };
    }>;
  };
  network: {
    getCurrentNetwork(): string;
    getCurrentOperatorOrThrow(): { accountId: string; keyRefId: string };
    getNetworkConfig(network: string): { mirrorNodeUrl: string };
  };
}

/** Matches the hiero-cli CommandHandlerArgs shape the handlers receive. */
export interface CommandHandlerArgs {
  args: Record<string, unknown>;
  api: SchedulePluginApi;
  logger: Logger;
  state: unknown;
  config: unknown;
}
