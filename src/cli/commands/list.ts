import { resolve } from "node:path";
import { getAllHooks, getPublicHooks, getRelativePath } from "../utils/registry.js";
import { requireConfig, isHookInstalled } from "../utils/commands.js";
import {
  Command,
  runListWorkflow,
  withErrorHandler,
} from "@b4r7/cli-core";

export const listCommand = new Command("list")
  .description("List available hooks")
  .option("--cwd <path>", "Working directory", ".")
  .option("--json", "Output as JSON", false)
  .option("--all", "Include hidden/internal items", false)
  .option("--installed", "Show only installed hooks")
  .action(withErrorHandler(async (opts) => {
    const cwd = resolve(opts.cwd);
    runListWorkflow({
      cwd,
      includeAll: Boolean(opts.all),
      installedOnly: Boolean(opts.installed),
      json: Boolean(opts.json),
      itemPlural: "hooks",
      getAllItems: getAllHooks,
      getPublicItems: getPublicHooks,
      requireConfig,
      isInstalled: ({ cwd, config, item }) =>
        isHookInstalled(cwd, config.hooksFsPath, item.name),
      toDisplayItem: (item) => ({
        name: item.name,
        title: item.title,
        description: item.description,
        dependencies: item.dependencies,
        files: item.files.map((file) => getRelativePath(file)),
      }),
    });
  }));
