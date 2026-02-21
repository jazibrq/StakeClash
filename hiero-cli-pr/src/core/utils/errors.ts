/**
 * hiero-cli-pr/src/core/utils/errors.ts
 *
 * Mirrors src/core/utils/errors.ts in hiero-ledger/hiero-cli.
 */

/**
 * Build a consistent error message string from an unknown catch value.
 *
 * @param context - A human-readable description of what was being attempted.
 * @param error   - The thrown value (may be an Error, string, or anything).
 */
export function formatError(context: string, error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  return `${context}: ${message}`;
}
