import { resolve } from "node:path";
import { getAllHooks, getPublicHooks, getRelativePath } from "../utils/registry.js";
import { requireConfig, isHookInstalled } from "../utils/commands.js";
import { Command, info, withErrorHandler } from "@b4r7/cli-core";

export const listCommand = new Command("list")
  .description("List available hooks")
  .option("--cwd <path>", "Working directory", ".")
  .option("--json", "Output as JSON", false)
  .option("--all", "Include hidden/internal items", false)
  .option("--installed", "Show only installed hooks")
  .action(withErrorHandler(async (opts) => {
    const cwd = resolve(opts.cwd);
    let hooks = opts.all ? getAllHooks() : getPublicHooks();

    if (opts.installed) {
      const config = requireConfig(cwd);
      hooks = hooks.filter(h =>
        isHookInstalled(cwd, config.hooksFsPath, h.name)
      );
    }
    hooks = [...hooks].sort((left, right) => left.name.localeCompare(right.name));

    if (opts.json) {
      console.log(JSON.stringify(hooks.map((hook) => ({
        name: hook.name,
        title: hook.title,
        description: hook.description,
        dependencies: hook.dependencies,
        files: hook.files.map((file) => getRelativePath(file)),
      })), null, 2));
      return;
    }

    if (hooks.length === 0) {
      console.log();
      info(opts.installed ? "No installed hooks found." : "No hooks available.");
      console.log();
      return;
    }

    console.log();
    const label = opts.installed ? "Installed" : "Available";
    info(`${label} hooks (${hooks.length}):`);
    console.log();

    const maxLen = Math.max(...hooks.map((hook) => hook.name.length)) + 2;
    for (const hook of hooks) {
      info(`  ${hook.name.padEnd(maxLen)} ${hook.description}`);
    }

    console.log();
  }));
