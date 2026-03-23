import { createListCommand } from "@b4r7/cli-core";
import { ctx } from "../context.js";

export const listCommand = createListCommand({
  itemPlural: "hooks",
  getAllItems: ctx.registry.getAllItems,
  getPublicItems: ctx.registry.getPublicItems,
  requireConfig: ctx.items.requireConfig,
  createInstallChecker: (cwd, config) => ctx.createChecker(cwd, config.hooksFsPath),
  getRelativePath: ctx.registry.relativePath,
});
