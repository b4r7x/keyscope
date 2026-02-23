import {
  z,
  ALIAS_PATTERN,
  loadJsonConfig,
  writeJsonConfig,
  updateManifest as coreUpdateManifest,
  aliasToFsPath,
  detectSourceDirFromTsconfig,
  type ConfigLoadResult,
} from "@b4r7/cli-core";
import { CONFIG_FILE } from "../constants.js";

export const KeyscopeConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().optional(),
  aliases: z.object({
    hooks: z.string().regex(ALIAS_PATTERN, 'Must start with "@/" or a relative path').optional(),
  }).optional(),
  hooksFsPath: z.string().optional(),
  installedHooks: z.record(z.string(), z.object({
    installedAt: z.string(),
    mode: z.enum(["copy", "package"]).optional(),
    keyscopeVersion: z.string().optional(),
  })).optional(),
});

export type KeyscopeConfig = z.infer<typeof KeyscopeConfigSchema>;

export type ManifestInstallMetadata = {
  mode?: "copy" | "package";
  keyscopeVersion?: string;
};

export interface ResolvedConfig {
  aliases: {
    hooks: string;
  };
  hooksFsPath: string;
}

const DEFAULT_ALIASES = {
  hooks: "@/hooks",
};

export function resolveConfig(raw: KeyscopeConfig, cwd?: string): ResolvedConfig {
  const aliases = { ...DEFAULT_ALIASES, ...raw.aliases };

  let hooksFsPath = raw.hooksFsPath;
  if (!hooksFsPath) {
    const sourceDir = cwd ? detectSourceDirFromTsconfig(cwd) : ".";
    hooksFsPath = aliasToFsPath(aliases.hooks, sourceDir);
  }

  return {
    aliases,
    hooksFsPath,
  };
}

export function loadConfig(cwd: string): ConfigLoadResult<KeyscopeConfig> {
  return loadJsonConfig(CONFIG_FILE, KeyscopeConfigSchema, cwd);
}

export function loadResolvedConfig(cwd: string): ConfigLoadResult<ResolvedConfig> {
  const result = loadConfig(cwd);
  if (!result.ok) return result;
  return { ok: true, config: resolveConfig(result.config, cwd) };
}

export function writeConfig(cwd: string, config: KeyscopeConfig): void {
  writeJsonConfig(CONFIG_FILE, config, cwd);
}

export function updateManifest(
  cwd: string,
  add?: string[],
  remove?: string[],
  metadata?: ManifestInstallMetadata,
): void {
  coreUpdateManifest(CONFIG_FILE, KeyscopeConfigSchema, "installedHooks", cwd, add, remove, metadata);
}

export function getManifestHooks(cwd: string): KeyscopeConfig["installedHooks"] {
  const result = loadConfig(cwd);
  if (!result.ok) return undefined;
  return result.config.installedHooks;
}
