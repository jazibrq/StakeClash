/**
 * hiero-cli-pr/src/core/shared/constants.ts
 *
 * Mirrors src/core/shared/constants.ts in hiero-ledger/hiero-cli.
 * Only the values used by the schedule plugin are included here.
 */

/** Outcome of a command execution. */
export enum Status {
  Success = 'success',
  Failure = 'failure',
}

/** Option value types declared in plugin manifests. */
export enum OptionType {
  STRING  = 'string',
  NUMBER  = 'number',
  BOOLEAN = 'boolean',
}
