import { resolve, relative, dirname } from "node:path";
import { existsSync, rmSync } from "node:fs";
import {
  getRegistryItem,
  getAllHooks,
  getRelativePath,
} from "../utils/registry.js";
import {
  Command, pc, ensureWithinDir, cleanEmptyDirs,
  info, error, success, heading, fileAction,
  promptConfirm, toErrorMessage, withErrorHandler,
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
    const config = requireConfig(cwd);

    validateHooks(hookNames);

    const retainedFiles = new Set<string>();
    const removedSet = new Set(hookNames);
    for (const hook of getAllHooks()) {
      if (removedSet.has(hook.name)) continue;
      if (!isHookInstalled(cwd, config.hooksFsPath, hook.name)) continue;
      for (const file of hook.files) {
        retainedFiles.add(resolve(cwd, config.hooksFsPath, getRelativePath(file)));
      }
    }

    const filesToRemove: string[] = [];
    const dirsToCheck = new Set<string>();
    const hooksDir = resolve(cwd, config.hooksFsPath);

    for (const name of hookNames) {
      const item = getHookOrThrow(name);
      for (const file of item.files) {
        const fullPath = resolve(cwd, config.hooksFsPath, getRelativePath(file));
        if (existsSync(fullPath) && !retainedFiles.has(fullPath)) {
          filesToRemove.push(fullPath);
          dirsToCheck.add(dirname(fullPath));
        }
      }
    }

    if (filesToRemove.length === 0) {
      info("No installed files found for the specified hooks.");
      return;
    }

    heading("Files to remove:");
    for (const file of filesToRemove) {
      fileAction(pc.red("-"), relative(cwd, file));
    }
    console.log();

    if (opts.dryRun) {
      info("(dry run - no changes made)");
      return;
    }

    if (!opts.yes) {
      const proceed = await promptConfirm(`Remove ${filesToRemove.length} file(s)?`, false);
      if (!proceed) {
        info("Cancelled.");
        return;
      }
    }

    for (const file of filesToRemove) {
      ensureWithinDir(file, hooksDir);
    }

    let removed = 0;
    for (const file of filesToRemove) {
      try {
        rmSync(file);
        removed++;
      } catch (e) {
        error(`Failed to remove ${relative(cwd, file)}: ${toErrorMessage(e)}`);
      }
    }

    cleanEmptyDirs([...dirsToCheck]);
    updateManifest(cwd, undefined, hookNames);

    const orphaned = findOrphanedNpmDeps(hookNames, cwd, config.hooksFsPath);
    if (orphaned.length > 0) {
      info(`Note: You may want to remove unused packages: ${orphaned.join(", ")}`);
    }

    console.log();
    success(`Removed ${removed} file(s) (${hookNames.join(", ")}).`);
    console.log();
  }));
