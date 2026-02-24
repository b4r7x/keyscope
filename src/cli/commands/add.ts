import { resolve } from "node:path";
import {
  collectNpmDeps,
  getPublicHooks,
  getRelativePath,
  resolveRegistryDeps,
} from "../utils/registry.js";
import {
  Command,
  depName,
  ensureWithinDir,
  getInstalledDeps,
  normalizeVersionSpec,
  runAddWorkflow,
  type FileOp,
  withErrorHandler,
} from "@b4r7/cli-core";
import { getHookOrThrow, requireConfig, validateHooks } from "../utils/commands.js";
import { updateManifest, type ManifestInstallMetadata } from "../utils/config.js";
import { VERSION } from "../constants.js";

import { parseMode, applyModeDeps } from "../utils/add-helpers.js";

export const addCommand = new Command("add")
  .description("Add keyscope hooks to your project")
  .argument("[hooks...]", "Hook names to add")
  .option("--cwd <path>", "Working directory", ".")
  .option("--all", "Add all hooks", false)
  .option("--mode <mode>", "Install mode: copy | package", "copy")
  .option("--keyscope-version <version>", "Version/tag used in package mode", "latest")
  .option("--overwrite", "Overwrite existing files", false)
  .option("--dry-run", "Preview changes without writing files", false)
  .option("--skip-install", "Write files without installing npm dependencies (offline-friendly)", false)
  .option("-y, --yes", "Skip confirmation prompts", false)
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    const mode = parseMode(opts.mode);
    const keyscopeVersionSpec = normalizeVersionSpec(opts.keyscopeVersion, "keyscope");

    await runAddWorkflow({
      cwd,
      requestedNames: hookNames,
      all: Boolean(opts.all),
      yes: Boolean(opts.yes),
      dryRun: Boolean(opts.dryRun),
      overwrite: Boolean(opts.overwrite),
      skipInstall: Boolean(opts.skipInstall),
      itemLabel: "Hook",
      itemPlural: "hooks",
      listCommand: "npx keyscope list",
      emptyRequestedMessage: "No hooks specified. Usage: npx keyscope add <hook> [hook...]",
      allIgnoresSpecifiedWarning: "--all flag ignores specified hook names.",
      requireConfig,
      getPublicNames: () => getPublicHooks().map((hook) => hook.name),
      validateRequestedNames: validateHooks,
      buildPlan: ({ cwd, config, names }) => {
        const resolved = resolveRegistryDeps(names);
        const extraDeps = resolved.filter((name) => !names.includes(name));

        const hooksDir = resolve(cwd, config.hooksFsPath);
        ensureWithinDir(hooksDir, cwd);

        const fileOps: FileOp[] = [];
        for (const name of resolved) {
          const item = getHookOrThrow(name);

          for (const file of item.files) {
            const relativePath = getRelativePath(file);
            const targetPath = resolve(cwd, config.hooksFsPath, relativePath);
            ensureWithinDir(targetPath, hooksDir);
            fileOps.push({
              targetPath,
              content: file.content,
              relativePath,
              installDir: config.hooksFsPath,
            });
          }
        }

        const npmDeps = applyModeDeps(collectNpmDeps(resolved), mode, keyscopeVersionSpec);
        const installed = getInstalledDeps(cwd);
        const missingDeps = npmDeps.filter((dep) => !installed.has(depName(dep)));

        return {
          resolvedNames: resolved,
          fileOps,
          missingDeps,
          extraDependencies: extraDeps,
          headingMessage: "Adding hooks...",
          onApplied: ({ resolvedNames }) => {
            const manifestMetadata: ManifestInstallMetadata = {
              mode,
            };

            if (mode === "copy") {
              manifestMetadata.keyscopeVersion = VERSION;
            } else if (mode === "package" && keyscopeVersionSpec !== "latest") {
              manifestMetadata.keyscopeVersion = keyscopeVersionSpec;
            }

            updateManifest(cwd, resolvedNames, undefined, manifestMetadata);
          },
        };
      },
    });
  }));
