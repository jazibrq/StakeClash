/**
 * hiero-cli-pr/src/core/schemas/common-schemas.ts
 *
 * Mirrors src/core/schemas/common-schemas.ts in hiero-ledger/hiero-cli.
 * Provides the reusable Zod schemas shared across plugins.
 */

import { z } from 'zod';

/**
 * A Hedera entity ID in shard.realm.num format.
 * Examples: "0.0.1234", "0.0.98"
 */
export const EntityIdSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'Must be a valid Hedera entity ID (shard.realm.num)');

/**
 * A Hedera transaction ID in the form <accountId>@<seconds>.<nanos>.
 * Examples: "0.0.1001@1700000000.000000000"
 */
export const TransactionIdSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+@\d+\.\d+$/,
    'Must be a valid Hedera transaction ID (<accountId>@<seconds>.<nanos>)',
  );

/**
 * A tinybar amount represented as a non-negative integer string.
 * Using a string avoids JS precision loss for large values.
 */
export const TinybarSchema = z
  .string()
  .regex(/^\d+$/, 'Amount must be a non-negative integer string (tinybars)');
