import { resolve } from "node:path";
import { getAllHooks, getRelativePath } from "../utils/registry.js";
import {
  createHookInstallChecker,
  getHookOrThrow,
  requireConfig,
  validateHooks,
} from "../utils/commands.js";
import { updateManifest } from "../utils/config.js";
import { createRemoveCommand, findOrphanedNpmDeps } from "@b4r7/cli-core";

export const removeCommand = createRemoveCommand({
  itemPlural: "hooks",
  requireConfig,
  validateNames: validateHooks,
  getAllItems: getAllHooks,
  getItemOrThrow: getHookOrThrow,
  getItemName: (item) => item.name,
  isInstalled: ({ cwd, config, item }) => {
    const checker = createHookInstallChecker(cwd, config.hooksFsPath);
    return checker(item.name);
  },
  resolveFilesForItem: ({ cwd, config, item }) =>
    item.files.map((file) => ({
      absolutePath: resolve(cwd, config.hooksFsPath, getRelativePath(file)),
    })),
  resolveAllowedBaseDirs: ({ cwd, config }) => [resolve(cwd, config.hooksFsPath)],
  updateManifest: ({ cwd, removedNames }) => {
    updateManifest(cwd, undefined, removedNames);
  },
  findOrphanedDeps: ({ removedNames, cwd, config }) => {
    const checker = createHookInstallChecker(cwd, config.hooksFsPath);
    return findOrphanedNpmDeps({
      removedNames,
      getAllItems: getAllHooks,
      getItemName: (h) => h.name,
      getItemDeps: (h) => h.dependencies,
      isInstalled: (h) => checker(h.name),
    });
  },
});
