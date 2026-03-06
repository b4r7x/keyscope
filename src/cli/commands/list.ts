import { getAllHooks, getPublicHooks, getRelativePath } from "../utils/registry.js";
import { createHookInstallChecker, requireConfig } from "../utils/commands.js";
import { createListCommand } from "@b4r7/cli-core";

export const listCommand = createListCommand({
  itemPlural: "hooks",
  getAllItems: getAllHooks,
  getPublicItems: getPublicHooks,
  requireConfig,
  createInstallChecker: (cwd, config) => createHookInstallChecker(cwd, config.hooksFsPath),
  toDisplayItem: (item) => ({
    name: item.name,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    files: item.files.map((file) => getRelativePath(file)),
  }),
});
