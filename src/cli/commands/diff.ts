import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
  getPublicHooks,
  getRelativePath,
} from "../utils/registry.js";
import { requireConfig, validateHooks, isHookInstalled, getHookOrThrow } from "../utils/commands.js";
import { Command, pc, ensureWithinDir, info, heading, withErrorHandler } from "@b4r7/cli-core";
import { createTwoFilesPatch } from "diff";

export const diffCommand = new Command("diff")
  .description("Compare local hooks with registry versions")
  .argument("[hooks...]", "Hook names to diff")
  .option("--cwd <path>", "Working directory", ".")
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    const config = requireConfig(cwd);

    let names = hookNames;
    if (names.length === 0) {
      names = getPublicHooks()
        .filter(h => isHookInstalled(cwd, config.hooksFsPath, h.name))
        .map(h => h.name);
      if (names.length === 0) {
        info("No installed hooks found.");
        return;
      }
    } else {
      validateHooks(names);
    }

    const hooksDir = resolve(cwd, config.hooksFsPath);
    let changed = 0;
    let unchanged = 0;
    let notInstalled = 0;

    for (const name of names) {
      const item = getHookOrThrow(name);

      for (const file of item.files) {
        const relativePath = getRelativePath(file);
        const localPath = resolve(cwd, config.hooksFsPath, relativePath);
        ensureWithinDir(localPath, hooksDir);

        if (!existsSync(localPath)) {
          info(`${pc.dim(name + "/")}${relativePath}: ${pc.yellow("not installed")}`);
          notInstalled++;
          continue;
        }

        const localContent = readFileSync(localPath, "utf-8");
        const registryContent = file.content;

        if (localContent === registryContent) {
          unchanged++;
          continue;
        }

        changed++;
        heading(`${name}/${relativePath}`);

        const patch = createTwoFilesPatch(
          `upstream/${relativePath}`,
          `local/${relativePath}`,
          registryContent,
          localContent,
          "upstream",
          "local",
        );

        const diffColors: Record<string, (s: string) => string> = {
          "+": pc.green,
          "-": pc.red,
          "@": pc.cyan,
        };
        for (const line of patch.split("\n")) {
          const prefix = line[0];
          const color = prefix && diffColors[prefix];
          const isHeader = line.startsWith("+++") || line.startsWith("---");
          console.log(color && !isHeader ? color(line) : line);
        }
      }
    }

    console.log();
    if (changed === 0 && notInstalled === 0) {
      info("All hooks are up to date with registry.");
    } else {
      const parts: string[] = [];
      if (changed > 0) parts.push(`${changed} changed`);
      if (unchanged > 0) parts.push(`${unchanged} unchanged`);
      if (notInstalled > 0) parts.push(`${notInstalled} not installed`);
      info(`Summary: ${parts.join(", ")}.`);
    }
  }));
