import {
  z,
  aliasPathSchema,
  createConfigModule,
  resolveAliasedPaths,
} from "@b4r7/cli-core";
import { CONFIG_FILE } from "../constants.js";

export const KeyscopeConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().optional(),
  aliases: z.object({
    hooks: aliasPathSchema,
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
  const resolved = resolveAliasedPaths(
    { hooks: raw.hooksFsPath },
    { hooks: aliases.hooks },
    cwd,
  );

  return {
    aliases,
    hooksFsPath: resolved.hooks,
  };
}

const configModule = createConfigModule<KeyscopeConfig, ResolvedConfig, ManifestInstallMetadata>({
  configFileName: CONFIG_FILE,
  schema: KeyscopeConfigSchema,
  resolveConfig,
  manifestKey: "installedHooks",
});

export const {
  loadConfig,
  loadResolvedConfig,
  writeConfig,
  updateManifest,
  getManifestItems: getManifestHooks,
} = configModule;
