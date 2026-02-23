import { resolve } from "node:path";
import {
  getRegistryItem,
  getAllHooks,
  getRelativePath,
} from "../utils/registry.js";
import {
  Command,
  runRemoveWorkflow,
  withErrorHandler,
} from "@b4r7/cli-core";
import { requireConfig, validateHooks, isHookInstalled, getHookOrThrow } from "../utils/commands.js";
import { updateManifest } from "../utils/config.js";

function findOrphanedNpmDeps(
  removedNames: string[],
  cwd: string,
  hooksFsPath: string,
): string[] {
  const removedDeps = new Set(removedNames.flatMap(n => getRegistryItem(n)?.dependencies ?? []));
  if (removedDeps.size === 0) return [];

  const removedSet = new Set(removedNames);
  const remainingDeps = new Set(
    getAllHooks()
      .filter(h => !removedSet.has(h.name) && isHookInstalled(cwd, hooksFsPath, h.name))
      .flatMap(h => h.dependencies),
  );
  return [...removedDeps].filter(d => !remainingDeps.has(d));
}

export const removeCommand = new Command("remove")
  .description("Remove hooks from your project")
  .argument("<hooks...>", "Hook names to remove")
  .option("--cwd <path>", "Working directory", ".")
  .option("-y, --yes", "Skip confirmation prompts", false)
  .option("--dry-run", "Preview changes without removing files", false)
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    await runRemoveWorkflow({
      cwd,
      names: hookNames,
      yes: Boolean(opts.yes),
      dryRun: Boolean(opts.dryRun),
      itemPlural: "hooks",
      requireConfig,
      validateNames: validateHooks,
      getAllItems: getAllHooks,
      getItemOrThrow: getHookOrThrow,
      getItemName: (item) => item.name,
      isInstalled: ({ cwd, config, item }) =>
        isHookInstalled(cwd, config.hooksFsPath, item.name),
      resolveFilesForItem: ({ cwd, config, item }) =>
        item.files.map((file) => ({
          absolutePath: resolve(cwd, config.hooksFsPath, getRelativePath(file)),
        })),
      resolveAllowedBaseDirs: ({ cwd, config }) => [resolve(cwd, config.hooksFsPath)],
      updateManifest: ({ cwd, removedNames }) => {
        updateManifest(cwd, undefined, removedNames);
      },
      findOrphanedDeps: ({ removedNames, cwd, config }) =>
        findOrphanedNpmDeps(removedNames, cwd, config.hooksFsPath),
    });
  }));
