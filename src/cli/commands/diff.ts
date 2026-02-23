import { resolve } from "node:path";
import {
  getPublicHooks,
  getRelativePath,
} from "../utils/registry.js";
import { requireConfig, validateHooks, isHookInstalled, getHookOrThrow } from "../utils/commands.js";
import {
  Command,
  pc,
  ensureWithinDir,
  heading,
  runDiffWorkflow,
  withErrorHandler,
} from "@b4r7/cli-core";
import { createTwoFilesPatch } from "diff";

export const diffCommand = new Command("diff")
  .description("Compare local hooks with registry versions")
  .argument("[hooks...]", "Hook names to diff")
  .option("--cwd <path>", "Working directory", ".")
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    runDiffWorkflow({
      cwd,
      requestedNames: hookNames,
      itemPlural: "hooks",
      requireConfig,
      resolveDefaultNames: ({ cwd, config }) =>
        getPublicHooks()
          .filter((hook) => isHookInstalled(cwd, config.hooksFsPath, hook.name))
          .map((hook) => hook.name),
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
      renderChangedFile: ({ file, localContent, registryContent }) => {
        heading(`${file.itemName}/${file.relativePath}`);
        const patch = createTwoFilesPatch(
          `upstream/${file.relativePath}`,
          `local/${file.relativePath}`,
          registryContent,
          localContent,
          "upstream",
          "local",
        );

        const diffColors: Record<string, (value: string) => string> = {
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
      },
    });
  }));
