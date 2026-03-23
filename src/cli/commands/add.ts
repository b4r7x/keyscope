import { resolve } from "node:path";
import {
  collectNpmDeps,
  getPublicHooks,
  getRelativePath,
  resolveRegistryDeps,
} from "../utils/registry.js";
import {
  createAddCommand,
  depName,
  ensureWithinDir,
  getInstalledDeps,
  normalizeVersionSpec,
  parseEnumOption,
  type FileOp,
} from "@b4r7/cli-core";
import { getHookOrThrow, requireConfig, validateHooks } from "../utils/commands.js";
import { updateManifest, type ManifestInstallMetadata } from "../utils/config.js";
import { VERSION } from "../constants.js";
import { applyModeDeps } from "../utils/add-helpers.js";

function buildHookFileOps(resolved: string[], cwd: string, hooksFsPath: string): FileOp[] {
  const hooksDir = resolve(cwd, hooksFsPath);
  ensureWithinDir(hooksDir, cwd);

  const fileOps: FileOp[] = [];
  for (const name of resolved) {
    const item = getHookOrThrow(name);
    for (const file of item.files) {
      const relativePath = getRelativePath(file);
      const targetPath = resolve(cwd, hooksFsPath, relativePath);
      ensureWithinDir(targetPath, hooksDir);
      fileOps.push({ targetPath, content: file.content, relativePath, installDir: hooksFsPath });
    }
  }
  return fileOps;
}

function buildManifestMetadata(mode: "copy" | "package", keyscopeVersionSpec: string): ManifestInstallMetadata {
  const metadata: ManifestInstallMetadata = { mode };
  if (mode === "copy") {
    metadata.keyscopeVersion = VERSION;
  } else if (mode === "package" && keyscopeVersionSpec !== "latest") {
    metadata.keyscopeVersion = keyscopeVersionSpec;
  }
  return metadata;
}

export const addCommand = createAddCommand({
  itemLabel: "Hook",
  itemPlural: "hooks",
  listCommand: "npx keyscope list",
  emptyRequestedMessage: "No hooks specified. Usage: npx keyscope add <hook> [hook...]",
  allIgnoresSpecifiedWarning: "--all flag ignores specified hook names.",
  requireConfig,
  getPublicNames: () => getPublicHooks().map((hook) => hook.name),
  validateRequestedNames: validateHooks,
  extraOptions: [
    { flags: "--mode <mode>", description: "Install mode: copy | package", default: "copy" },
    { flags: "--keyscope-version <version>", description: "Version/tag used in package mode", default: "latest" },
  ],
  buildPlan: ({ cwd, config, names, opts }) => {
    const mode = parseEnumOption(String(opts.mode).toLowerCase(), ["copy", "package"] as const, "--mode");
    const keyscopeVersionSpec = normalizeVersionSpec(opts.keyscopeVersion, "keyscope");
    const resolved = resolveRegistryDeps(names);

    const fileOps = buildHookFileOps(resolved, cwd, config.hooksFsPath);
    const npmDeps = applyModeDeps(collectNpmDeps(resolved), mode, keyscopeVersionSpec);
    const installed = getInstalledDeps(cwd);

    return {
      resolvedNames: resolved,
      fileOps,
      missingDeps: npmDeps.filter((dep) => !installed.has(depName(dep))),
      extraDependencies: resolved.filter((name) => !names.includes(name)),
      headingMessage: "Adding hooks...",
      onApplied: ({ resolvedNames }) => {
        updateManifest(cwd, resolvedNames, undefined, buildManifestMetadata(mode, keyscopeVersionSpec));
      },
    };
  },
});
