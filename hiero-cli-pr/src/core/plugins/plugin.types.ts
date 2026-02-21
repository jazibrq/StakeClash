/**
 * hiero-cli-pr/src/core/plugins/plugin.types.ts
 *
 * Mirrors src/core/plugins/plugin.types.ts in hiero-ledger/hiero-cli.
 * Defines the manifest shape that every plugin must export.
 */

import type { z } from 'zod';

import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { OptionType } from '@/core/shared/constants';

// ── Option descriptor ─────────────────────────────────────────────────────────

export interface PluginCommandOption {
  /** The CLI flag name, e.g. "to", "expiry-seconds" */
  name: string;

  /** Data type — used by the CLI core to coerce raw string input. */
  type: OptionType;

  /** Short description shown in --help output. */
  description: string;

  /** Whether the option must be supplied by the caller. */
  required: boolean;

  /** Default value used when the option is omitted. */
  default?: unknown;
}

// ── Output descriptor ─────────────────────────────────────────────────────────

export interface PluginCommandOutput {
  /**
   * Zod schema for validating and documenting the JSON output object.
   * The CLI core uses this to validate `outputJson` before rendering.
   */
  schema: z.ZodTypeAny;

  /**
   * Handlebars template string rendered when `--output human` (the default).
   * Receives the parsed `outputJson` as template data.
   */
  humanTemplate: string;
}

// ── Single command entry ──────────────────────────────────────────────────────

export interface PluginCommand {
  /** Full command name, e.g. "schedule:create" */
  name: string;

  /** One-line summary for --help listings. */
  summary: string;

  /** Extended description shown in `<command> --help`. */
  description?: string;

  /** Declared options accepted by this command. */
  options: PluginCommandOption[];

  /** The async function executed when the command is invoked. */
  handler: (args: CommandHandlerArgs) => Promise<CommandExecutionResult>;

  /** Output configuration (schema + human template). */
  output: PluginCommandOutput;
}

// ── Top-level plugin manifest ─────────────────────────────────────────────────

export interface PluginManifest {
  /** Machine-readable plugin name, e.g. "schedule" */
  name: string;

  /** Semver version string. */
  version: string;

  /** Human-readable display name shown in CLI help. */
  displayName: string;

  /** Short description of what the plugin does. */
  description: string;

  /** All commands contributed by this plugin. */
  commands: PluginCommand[];
}
