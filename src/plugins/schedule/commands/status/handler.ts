import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { StatusInputSchema } from './input';
import type { StatusOutput } from './output';

interface MirrorScheduleResponse {
  schedule_id: string;
  executed_timestamp: string | null;
  deleted: boolean;
  memo?: string;
  consensus_timestamp?: string;
  expiration_time?: string;
}

export async function getScheduleStatus(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = StatusInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];

  const network = api.network.getCurrentNetwork();
  const mirrorBase = api.network.getNetworkConfig(network).mirrorNodeUrl.replace(/\/$/, '');

  try {
    logger.info(`Fetching schedule info for ${scheduleId} …`);

    const url = `${mirrorBase}/api/v1/schedules/${scheduleId}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return {
        status: Status.Failure,
        errorMessage: `Schedule ${scheduleId} not found on ${network}.`,
      };
    }

    if (!response.ok) {
      return {
        status: Status.Failure,
        errorMessage: `Mirror node returned HTTP ${response.status} for ${url}`,
      };
    }

    const data = (await response.json()) as MirrorScheduleResponse;

    const executed =
      data.executed_timestamp !== null && data.executed_timestamp !== undefined;
    const deleted = Boolean(data.deleted);

    const state: StatusOutput['state'] = executed
      ? 'EXECUTED'
      : deleted
        ? 'DELETED'
        : 'PENDING';

    const output: StatusOutput = {
      scheduleId,
      state,
      executed,
      deleted,
      createdAt: data.consensus_timestamp
        ? new Date(Number(data.consensus_timestamp.split('.')[0]) * 1000).toISOString()
        : undefined,
      expiresAt: data.expiration_time
        ? new Date(Number(data.expiration_time.split('.')[0]) * 1000).toISOString()
        : undefined,
      memo: data.memo || undefined,
      network,
    };

    return { status: Status.Success, outputJson: JSON.stringify(output) };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Failed to fetch schedule status for ${scheduleId}`, error),
    };
  }
}
