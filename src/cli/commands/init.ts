import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createInitCommand, detectPackageManager, detectSourceDir, ensureWithinDir, REGISTRY_ORIGIN } from "@b4r7/cli-core";
import { ctx, VERSION } from "../context.js";

function resolveHooksDir(cwd: string, opts: Record<string, unknown>): string {
  return String(opts.hooksDir ?? "") || `${detectSourceDir(cwd)}/hooks`;
}

export const initCommand = createInitCommand({
  configFileName: "keyscope.json",
  loadConfig: ctx.config.loadConfig,
  extraOptions: [{ flags: "--hooks-dir <path>", description: "Hooks install directory" }],
  detectProject: (cwd, opts) => {
    const sourceDir = detectSourceDir(cwd);
    const hooksDir = resolveHooksDir(cwd, opts);
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
    const hooksDir = resolveHooksDir(cwd, opts);
    mkdirSync(resolve(cwd, hooksDir), { recursive: true });
    return [{ action: "created", path: `${hooksDir}/` }];
  },
  writeConfig: (cwd, opts) => {
    const hooksDir = resolveHooksDir(cwd, opts);
    ctx.config.writeConfig(cwd, {
      $schema: `${REGISTRY_ORIGIN}/schema/keyscope.json`,
      version: VERSION,
      aliases: { hooks: "@/hooks" },
      hooksFsPath: hooksDir,
    });
  },
  nextSteps: ["Add hooks with: npx keyscope add <hook>"],
});
