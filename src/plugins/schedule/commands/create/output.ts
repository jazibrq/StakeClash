import { z } from 'zod';

import { EntityIdSchema, TransactionIdSchema } from '@/core/schemas/common-schemas';

export const CreateOutputSchema = z.object({
  scheduleId: EntityIdSchema,
  transactionId: TransactionIdSchema,
  payer: EntityIdSchema,
  expirySeconds: z.number().int().positive(),
  network: z.string(),
  memo: z.string().optional(),
});

export type CreateScheduleOutput = z.infer<typeof CreateOutputSchema>;

export const CREATE_HUMAN_TEMPLATE = `
Scheduled Transaction Created
  Schedule ID:    {{scheduleId}}
  Transaction ID: {{transactionId}}
  Payer:          {{payer}}
  Expiry:         {{expirySeconds}}s from submission
  Network:        {{network}}
{{#if memo}}  Memo:           {{memo}}{{/if}}
`.trim();
