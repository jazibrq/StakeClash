import { z } from 'zod';

/**
 * Common Zod schemas — subset of hiero-ledger/hiero-cli src/core/schemas/common-schemas.ts.
 * Only the schemas used by the schedule plugin are included.
 */

/** Hedera entity ID: shard.realm.num, e.g. "0.0.1234" */
export const EntityIdSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Must be a valid Hedera entity ID (e.g. 0.0.1234)');

/** Hedera transaction ID, e.g. "0.0.1234@1700000000.000000000" */
export const TransactionIdSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+@\d+\.\d+$/, 'Must be a valid Hedera transaction ID');

/** Tinybar string — non-negative integer */
export const TinybarSchema = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative integer string representing tinybars');
