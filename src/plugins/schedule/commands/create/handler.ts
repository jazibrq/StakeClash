/**
 * schedule:create handler
 *
 * Builds a ScheduleCreateTransaction wrapping an HBAR transfer and submits it
 * via api.txExecution.signAndExecute — indifferent to whether the executor is
 * the Hiero CLI core or the StakeClash env-var adapter.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import {
  Hbar,
  ScheduleCreateTransaction,
  Timestamp,
  TransferTransaction,
} from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { CreateInputSchema } from './input';
import type { CreateScheduleOutput } from './output';

export async function createSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Validation before try-catch so ZodErrors propagate uncaught (CLI contract)
  const validArgs = CreateInputSchema.parse(args.args);

  const expirySeconds = validArgs['expiry-seconds'];
  const network = api.network.getCurrentNetwork();
  const operator = api.network.getCurrentOperatorOrThrow();

  try {
    const innerTransfer = new TransferTransaction()
      .addHbarTransfer(validArgs.to, Hbar.fromTinybars(validArgs.amount))
      .addHbarTransfer(operator.accountId, Hbar.fromTinybars(`-${validArgs.amount}`));

    const expiresAt = new Timestamp(
      Math.floor(Date.now() / 1000) + expirySeconds,
      0,
    );

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTransfer)
      .setExpirationTime(expiresAt)
      .setWaitForExpiry(true);

    if (validArgs.memo) {
      scheduleTx.setScheduleMemo(validArgs.memo);
    }

    logger.info(
      `Creating scheduled HBAR transfer → ${validArgs.to} (${validArgs.amount} tinybars)`,
    );

    const result = await api.txExecution.signAndExecute(scheduleTx);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage:
          'Transaction was submitted but the network returned a non-success status.',
      };
    }

    if (!result.scheduleId) {
      return {
        status: Status.Failure,
        errorMessage:
          'Transaction succeeded but schedule ID was not returned in the receipt.',
      };
    }

    const output: CreateScheduleOutput = {
      scheduleId: result.scheduleId,
      transactionId: result.transactionId,
      payer: operator.accountId,
      expirySeconds,
      network,
      memo: validArgs.memo,
    };

    return { status: Status.Success, outputJson: JSON.stringify(output) };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create scheduled transaction', error),
    };
  }
}
