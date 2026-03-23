import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createInitCommand, detectPackageManager, detectSourceDir, ensureWithinDir } from "@b4r7/cli-core";
import { writeConfig, loadConfig } from "../utils/config.js";
import { CONFIG_FILE, VERSION } from "../constants.js";

export const initCommand = createInitCommand({
  configFileName: CONFIG_FILE,
  loadConfig,
  extraOptions: [{ flags: "--hooks-dir <path>", description: "Hooks install directory" }],
  detectProject: (cwd, opts) => {
    const sourceDir = detectSourceDir(cwd);
    const hooksDir = String(opts.hooksDir ?? "") || `${sourceDir}/hooks`;
    ensureWithinDir(resolve(cwd, hooksDir), cwd);
    return {
      display: [
        ["Package manager", detectPackageManager(cwd)],
        ["Source dir", `${sourceDir}/`],
        ["Hooks dir", hooksDir],
      ],
    };
  },
  createFiles: (cwd, opts) => {
    const hooksDir = String(opts.hooksDir ?? "") || `${detectSourceDir(cwd)}/hooks`;
    mkdirSync(resolve(cwd, hooksDir), { recursive: true });
    return [{ action: "created", path: `${hooksDir}/` }];
  },
  writeConfig: (cwd, opts) => {
    const hooksDir = String(opts.hooksDir ?? "") || `${detectSourceDir(cwd)}/hooks`;
    writeConfig(cwd, {
      $schema: "https://diffgazer.com/schema/keyscope.json",
      version: VERSION,
      aliases: { hooks: "@/hooks" },
      hooksFsPath: hooksDir,
    });
  },
  nextSteps: ["Add hooks with: npx keyscope add <hook>"],
});
