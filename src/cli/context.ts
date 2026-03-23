import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  aliasPathSchema,
  BaseRegistryBundleSchema,
  createConfigModule,
  createInstallChecker,
  createItemAccessors,
  createRegistryAccessors,
  createRegistryLoader,
  resolveAliasedPaths,
} from "@b4r7/cli-core";

// --- Version ---

const req = createRequire(import.meta.url);
export const VERSION: string = (req("../../package.json") as { version: string }).version;

// --- Config Schema ---

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
  aliases: { hooks: string };
  hooksFsPath: string;
}

const DEFAULT_ALIASES = { hooks: "@/hooks" };

export function resolveConfig(raw: KeyscopeConfig, cwd?: string): ResolvedConfig {
  const aliases = { ...DEFAULT_ALIASES, ...raw.aliases };
  const resolved = resolveAliasedPaths(
    { hooks: raw.hooksFsPath },
    { hooks: aliases.hooks },
    cwd,
  );
  return { aliases, hooksFsPath: resolved.hooks };
}

// --- Add Helpers ---

export type AddMode = "copy" | "package";

export function applyModeDeps(deps: string[], mode: AddMode, keyscopeVersionSpec: string): string[] {
  const depSet = new Set(deps.filter((dep) => !dep.startsWith("keyscope@")));
  depSet.delete("keyscope");
  if (mode === "package") {
    depSet.add(keyscopeVersionSpec === "latest" ? "keyscope" : `keyscope@${keyscopeVersionSpec}`);
  }
  return [...depSet];
}

// --- Context ---

const CONFIG_FILE = "keyscope.json";
const __dirname = dirname(fileURLToPath(import.meta.url));

const loader = createRegistryLoader(
  resolve(__dirname, "../generated/registry-bundle.json"),
  BaseRegistryBundleSchema,
  (bundle) => ({ items: bundle.items }),
);

const registry = createRegistryAccessors({
  loader,
  itemLabel: "Hook",
  pathPrefixes: ["registry/hooks/", "src/hooks/"],
  itemTypeFilter: "registry:hook",
});

const config = createConfigModule<KeyscopeConfig, ResolvedConfig, ManifestInstallMetadata>({
  configFileName: CONFIG_FILE,
  schema: KeyscopeConfigSchema,
  resolveConfig,
  manifestKey: "installedHooks",
});

const items = createItemAccessors({
  configFileName: CONFIG_FILE,
  initCommand: "npx keyscope init",
  itemLabel: "Hook",
  listCommand: "npx keyscope list",
  loadResolved: config.loadResolvedConfig,
  getItem: registry.getItem,
});

export const ctx = {
  registry,
  config,
  items,
  createChecker: (cwd: string, hooksFsPath: string) =>
    createInstallChecker({
      getManifest: () => config.getManifestItems(cwd),
      getItem: registry.getItem,
      getRelativePath: registry.relativePath,
      installDir: resolve(cwd, hooksFsPath),
      extensions: [],
    }),
} as const;
