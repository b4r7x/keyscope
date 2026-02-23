import { resolve } from "node:path";
import {
  getPublicHooks,
  getRelativePath,
} from "../utils/registry.js";
import {
  createHookInstallChecker,
  getHookOrThrow,
  requireConfig,
  validateHooks,
} from "../utils/commands.js";
import {
  Command,
  ensureWithinDir,
  renderDiffPatch,
  runDiffWorkflow,
  withErrorHandler,
} from "@b4r7/cli-core";

export const diffCommand = new Command("diff")
  .description("Compare local hooks with registry versions")
  .argument("[hooks...]", "Hook names to diff")
  .option("--cwd <path>", "Working directory", ".")
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    let isInstalledHook: ((name: string) => boolean) | undefined;

    runDiffWorkflow({
      cwd,
      requestedNames: hookNames,
      itemPlural: "hooks",
      requireConfig,
      resolveDefaultNames: ({ cwd, config }) =>
        getPublicHooks()
          .filter((hook) => {
            isInstalledHook ??= createHookInstallChecker(cwd, config.hooksFsPath);
            return isInstalledHook(hook.name);
          })
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
      renderChangedFile: renderDiffPatch,
    });
  }));
