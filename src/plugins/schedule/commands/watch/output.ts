import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const WatchOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  finalState: z.enum(['EXECUTED', 'DELETED', 'TIMEOUT']),
  resolvedAt: z.string(),
  elapsedSeconds: z.number(),
  network: z.string(),
});

export type WatchOutput = z.infer<typeof WatchOutputSchema>;
