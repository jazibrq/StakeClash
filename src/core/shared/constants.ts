/**
 * Matches hiero-ledger/hiero-cli src/core/shared/constants.ts
 * Keeping the same names so plugin handlers compile unchanged.
 */
export enum Status {
  Success = 'success',
  Failure = 'failure',
}

export enum OptionType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}
