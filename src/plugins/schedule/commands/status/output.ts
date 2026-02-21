import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const StatusOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  state: z.enum(['PENDING', 'EXECUTED', 'DELETED']),
  executed: z.boolean(),
  deleted: z.boolean(),
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
  memo: z.string().optional(),
  network: z.string(),
});

export type StatusOutput = z.infer<typeof StatusOutputSchema>;
