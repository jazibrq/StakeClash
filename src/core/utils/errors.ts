/**
 * Minimal error-formatting utility.
 * Mirrors hiero-ledger/hiero-cli src/core/utils/errors.ts.
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
