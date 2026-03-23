import { resolve } from "node:path";
import { createDiffCommand, ensureWithinDir } from "@b4r7/cli-core";
import { ctx } from "../context.js";

export const diffCommand = createDiffCommand({
  itemPlural: "hooks",
  requireConfig: ctx.items.requireConfig,
  resolveDefaultNames: ({ cwd, config }) => {
    const isInstalled = ctx.createChecker(cwd, config.hooksFsPath);
    return ctx.registry.getPublicItems()
      .filter((hook) => isInstalled(hook.name))
      .map((hook) => hook.name);
  },
  validateRequestedNames: ctx.items.validate,
  resolveFilesForName: ({ name, cwd, config }) => {
    const hooksDir = resolve(cwd, config.hooksFsPath);
    const item = ctx.items.getOrThrow(name);

    return item.files.map((file) => {
      const relativePath = ctx.registry.relativePath(file);
      const localPath = resolve(cwd, config.hooksFsPath, relativePath);
      ensureWithinDir(localPath, hooksDir);

      return {
        itemName: name,
        relativePath,
        localPath,
        registryContent: file.content,
      };
    });
  },
  noInstalledMessage: "No installed hooks found.",
  upToDateMessage: "All hooks are up to date with registry.",
});
