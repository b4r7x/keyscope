import { resolve } from "node:path";
import { createRemoveCommand, findOrphanedNpmDeps } from "@b4r7/cli-core";
import { ctx } from "../context.js";

export const removeCommand = createRemoveCommand({
  itemPlural: "hooks",
  requireConfig: ctx.items.requireConfig,
  validateNames: ctx.items.validate,
  getAllItems: ctx.registry.getAllItems,
  getItemOrThrow: ctx.items.getOrThrow,
  getItemName: (item) => item.name,
  isInstalled: ({ cwd, config, item }) => {
    const checker = ctx.createChecker(cwd, config.hooksFsPath);
    return checker(item.name);
  },
  resolveFilesForItem: ({ cwd, config, item }) =>
    item.files.map((file) => ({
      absolutePath: resolve(cwd, config.hooksFsPath, ctx.registry.relativePath(file)),
    })),
  resolveAllowedBaseDirs: ({ cwd, config }) => [resolve(cwd, config.hooksFsPath)],
  updateManifest: ({ cwd, removedNames }) => {
    ctx.config.updateManifest(cwd, undefined, removedNames);
  },
  findOrphanedDeps: ({ removedNames, cwd, config }) => {
    const checker = ctx.createChecker(cwd, config.hooksFsPath);
    return findOrphanedNpmDeps({
      removedNames,
      getAllItems: ctx.registry.getAllItems,
      getItemName: (h) => h.name,
      getItemDeps: (h) => h.dependencies,
      isInstalled: (h) => checker(h.name),
    });
  },
});
