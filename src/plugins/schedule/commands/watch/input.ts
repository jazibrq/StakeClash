import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const WatchInputSchema = z.object({
  'schedule-id': EntityIdSchema,
  'poll-interval': z.number().int().positive().min(1).optional().default(3),
  timeout: z.number().int().positive().optional().default(3600),
});

export type WatchInput = z.infer<typeof WatchInputSchema>;
