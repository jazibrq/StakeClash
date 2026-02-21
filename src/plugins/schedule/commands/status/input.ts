import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const StatusInputSchema = z.object({
  'schedule-id': EntityIdSchema,
});

export type StatusInput = z.infer<typeof StatusInputSchema>;
