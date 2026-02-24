import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Command, detectPackageManager, detectSourceDir, ensureWithinDir, runInitWorkflow, withErrorHandler } from "@b4r7/cli-core";
import { writeConfig, loadConfig } from "../utils/config.js";
import { CONFIG_FILE, VERSION } from "../constants.js";

export const initCommand = new Command("init")
  .description("Initialize keyscope hooks CLI in your project")
  .option("--cwd <path>", "Working directory", ".")
  .option("--hooks-dir <path>", "Hooks install directory")
  .option("-y, --yes", "Skip confirmation prompts", false)
  .option("--force", "Overwrite existing configuration", false)
  .action(withErrorHandler(async (opts) => {
    const cwd = resolve(opts.cwd);
    const packageManager = detectPackageManager(cwd);
    const sourceDir = detectSourceDir(cwd);
    const hooksDir = opts.hooksDir || `${sourceDir}/hooks`;

    ensureWithinDir(resolve(cwd, hooksDir), cwd);

    await runInitWorkflow({
      cwd,
      configFileName: CONFIG_FILE,
      yes: opts.yes,
      force: opts.force,
      loadConfig,
      detectProject: () => ({
        display: [
          ["Package manager", packageManager],
          ["Source dir", `${sourceDir}/`],
          ["Hooks dir", hooksDir],
        ],
      }),
      createFiles: (cwd) => {
        mkdirSync(resolve(cwd, hooksDir), { recursive: true });
        return [{ action: "created", path: `${hooksDir}/` }];
      },
      writeConfig: (cwd) => {
        writeConfig(cwd, {
          $schema: "https://diffgazer.com/schema/keyscope.json",
          version: VERSION,
          aliases: { hooks: "@/hooks" },
          hooksFsPath: hooksDir,
        });
      },
      nextSteps: ["Add hooks with: npx keyscope add <hook>"],
    });
  }));
