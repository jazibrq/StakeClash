import { z } from 'zod';

import { EntityIdSchema } from '@/core/schemas/common-schemas';

export const CreateInputSchema = z.object({
  to: EntityIdSchema,
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount must be a non-negative integer string (tinybars)'),
  'expiry-seconds': z
    .number()
    .int()
    .positive()
    .max(5_184_000, 'Expiry cannot exceed 60 days (5184000 s)')
    .optional()
    .default(3600),
  memo: z.string().max(100).optional(),
});

export type CreateInput = z.infer<typeof CreateInputSchema>;
