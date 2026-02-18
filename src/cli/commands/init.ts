import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { Command, pc, detectPackageManager, detectSourceDir, ensureWithinDir, info, success, warn, heading, fileAction, promptConfirm, withErrorHandler } from "@b4r7/cli-core";
import { writeConfig, loadConfig } from "../utils/config.js";
import { CONFIG_FILE } from "../constants.js";
import { VERSION } from "../constants.js";

export const initCommand = new Command("init")
  .description("Initialize keyscope hooks CLI in your project")
  .option("--cwd <path>", "Working directory", ".")
  .option("--hooks-dir <path>", "Hooks install directory")
  .option("-y, --yes", "Skip confirmation prompts", false)
  .option("--force", "Overwrite existing configuration", false)
  .action(withErrorHandler(async (opts) => {
    const cwd = resolve(opts.cwd);

    if (!existsSync(resolve(cwd, "package.json"))) {
      throw new Error("No package.json found. Run `npm init` first.");
    }

    const existing = loadConfig(cwd);
    if (existing.ok && !opts.force) {
      warn("keyscope is already initialized in this project.");
      info(`Config: ${resolve(cwd, CONFIG_FILE)}`);
      info("Use --force to re-initialize.");
      return;
    }

    if (
      !existing.ok
      && (existing.error === "parse_error" || existing.error === "validation_error")
      && !opts.force
    ) {
      throw new Error(
        `${CONFIG_FILE} is malformed: ${existing.message}\n`
        + `Fix the syntax error, delete ${CONFIG_FILE}, or use --force to re-initialize.`,
      );
    }

    const packageManager = detectPackageManager(cwd);
    const sourceDir = detectSourceDir(cwd);
    const hooksDir = opts.hooksDir || `${sourceDir}/hooks`;

    ensureWithinDir(resolve(cwd, hooksDir), cwd);

    heading("Detected:");
    info(`Package manager: ${packageManager}`);
    info(`Source dir: ${sourceDir}/`);
    info(`Hooks dir: ${hooksDir}`);
    console.log();

    if (!opts.yes) {
      const proceed = await promptConfirm("Continue with initialization?");
      if (!proceed) {
        info("Cancelled.");
        return;
      }
    }

    heading("Creating files...");
    mkdirSync(resolve(cwd, hooksDir), { recursive: true });
    fileAction(pc.green("+"), `${hooksDir}/`);

    writeConfig(cwd, {
      $schema: "https://keyscope.dev/schema/keyscope.json",
      version: VERSION,
      aliases: {
        hooks: "@/hooks",
      },
      hooksFsPath: hooksDir,
    });

    fileAction(pc.green("+"), CONFIG_FILE);
    console.log();
    success("Done!");
    info("Add hooks with: npx keyscope add <hook>");
    console.log();
  }));
