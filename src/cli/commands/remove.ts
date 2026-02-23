import { resolve } from "node:path";
import {
  getAllHooks,
  getRelativePath,
} from "../utils/registry.js";
import {
  Command,
  findOrphanedNpmDeps,
  runRemoveWorkflow,
  withErrorHandler,
} from "@b4r7/cli-core";
import {
  createHookInstallChecker,
  getHookOrThrow,
  requireConfig,
  validateHooks,
} from "../utils/commands.js";
import { updateManifest } from "../utils/config.js";

export const removeCommand = new Command("remove")
  .description("Remove hooks from your project")
  .argument("<hooks...>", "Hook names to remove")
  .option("--cwd <path>", "Working directory", ".")
  .option("-y, --yes", "Skip confirmation prompts", false)
  .option("--dry-run", "Preview changes without removing files", false)
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    let isInstalledHook: ((name: string) => boolean) | undefined;
    const getInstallChecker = (hooksFsPath: string): ((name: string) => boolean) => {
      isInstalledHook ??= createHookInstallChecker(cwd, hooksFsPath);
      return isInstalledHook;
    };

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
      isInstalled: ({ config, item }) =>
        getInstallChecker(config.hooksFsPath)(item.name),
      resolveFilesForItem: ({ cwd, config, item }) =>
        item.files.map((file) => ({
          absolutePath: resolve(cwd, config.hooksFsPath, getRelativePath(file)),
        })),
      resolveAllowedBaseDirs: ({ cwd, config }) => [resolve(cwd, config.hooksFsPath)],
      updateManifest: ({ cwd, removedNames }) => {
        updateManifest(cwd, undefined, removedNames);
      },
      findOrphanedDeps: ({ removedNames, config }) =>
        findOrphanedNpmDeps({
          removedNames,
          getAllItems: getAllHooks,
          getItemName: (h) => h.name,
          getItemDeps: (h) => h.dependencies,
          isInstalled: (h) => getInstallChecker(config.hooksFsPath)(h.name),
        }),
    });
  }));
