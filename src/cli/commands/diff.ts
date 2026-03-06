import { resolve } from "node:path";
import { getPublicHooks, getRelativePath } from "../utils/registry.js";
import {
  createHookInstallChecker,
  getHookOrThrow,
  requireConfig,
  validateHooks,
} from "../utils/commands.js";
import { createDiffCommand, ensureWithinDir } from "@b4r7/cli-core";

export const diffCommand = createDiffCommand({
  itemPlural: "hooks",
  requireConfig,
  resolveDefaultNames: ({ cwd, config }) => {
    const isInstalled = createHookInstallChecker(cwd, config.hooksFsPath);
    return getPublicHooks()
      .filter((hook) => isInstalled(hook.name))
      .map((hook) => hook.name);
  },
  validateRequestedNames: validateHooks,
  resolveFilesForName: ({ name, cwd, config }) => {
    const hooksDir = resolve(cwd, config.hooksFsPath);
    const item = getHookOrThrow(name);

    return item.files.map((file) => {
      const relativePath = getRelativePath(file);
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
