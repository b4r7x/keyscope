import { resolve } from "node:path";
import {
  collectNpmDeps,
  getPublicHooks,
  getRelativePath,
  resolveRegistryDeps,
  getRegistryItem,
} from "../utils/registry.js";
import {
  Command, ensureWithinDir, getInstalledDeps,
  info, success, warn, heading, promptConfirm, withErrorHandler,
  depName, normalizeVersionSpec,
} from "@b4r7/cli-core";
import { requireConfig, validateHooks } from "../utils/commands.js";
import { updateManifest, type ManifestInstallMetadata } from "../utils/config.js";
import {
  type FileOp,
  writeFilesWithRollback,
  showDryRunPreview,
  showDryRunDeps,
  formatWriteSummary,
  installDepsWithRollback,
} from "@b4r7/cli-core";
import { VERSION } from "../constants.js";

type AddMode = "copy" | "package";

function parseMode(raw: unknown): AddMode {
  const mode = String(raw ?? "copy").toLowerCase();
  if (mode === "copy" || mode === "package") {
    return mode;
  }

  throw new Error(`Invalid value for --mode: "${raw}". Expected one of: copy, package.`);
}

function applyModeDeps(deps: string[], mode: AddMode, keyscopeVersionSpec: string): string[] {
  const depSet = new Set(deps.filter((dep) => !dep.startsWith("keyscope@")));

  if (mode === "copy") {
    depSet.delete("keyscope");
    return [...depSet];
  }

  depSet.delete("keyscope");
  depSet.add(keyscopeVersionSpec === "latest" ? "keyscope" : `keyscope@${keyscopeVersionSpec}`);

  return [...depSet];
}

export const addCommand = new Command("add")
  .description("Add keyscope hooks to your project")
  .argument("[hooks...]", "Hook names to add")
  .option("--cwd <path>", "Working directory", ".")
  .option("--all", "Add all hooks", false)
  .option("--mode <mode>", "Install mode: copy | package", "copy")
  .option("--keyscope-version <version>", "Version/tag used in package mode", "latest")
  .option("--overwrite", "Overwrite existing files", false)
  .option("--dry-run", "Preview changes without writing files", false)
  .option("-y, --yes", "Skip confirmation prompts", false)
  .action(withErrorHandler(async (hookNames: string[], opts) => {
    const cwd = resolve(opts.cwd);
    const config = requireConfig(cwd);
    const mode = parseMode(opts.mode);
    const keyscopeVersionSpec = normalizeVersionSpec(opts.keyscopeVersion, "keyscope");

    let names: string[];
    const publicHooks = getPublicHooks();
    const publicHookNames = new Set(publicHooks.map((hook) => hook.name));

    if (opts.all) {
      if (hookNames.length > 0) {
        warn("--all flag ignores specified hook names.");
      }
      names = publicHooks.map((hook) => hook.name);
    } else {
      if (hookNames.length === 0) {
        throw new Error("No hooks specified. Usage: npx keyscope add <hook> [hook...]\nRun `npx keyscope list` to see available hooks.");
      }

      for (const name of hookNames) {
        if (!publicHookNames.has(name)) {
          throw new Error(`Hook "${name}" not found in public registry items. Run \`npx keyscope list\` to see available hooks.`);
        }
      }

      validateHooks(hookNames);
      names = hookNames;
    }

    const resolved = resolveRegistryDeps(names);
    const extraDeps = resolved.filter((name) => !names.includes(name));
    if (extraDeps.length > 0) {
      info(`Also adding dependencies: ${extraDeps.join(", ")}`);
    }

    const hooksDir = resolve(cwd, config.hooksFsPath);
    ensureWithinDir(hooksDir, cwd);

    const fileOps: FileOp[] = [];
    for (const name of resolved) {
      const item = getRegistryItem(name);
      if (!item) {
        throw new Error(`Registry item "${name}" not found.`);
      }

      for (const file of item.files) {
        const relativePath = getRelativePath(file);
        const content = file.content;
        const targetPath = resolve(cwd, config.hooksFsPath, relativePath);
        ensureWithinDir(targetPath, hooksDir);
        fileOps.push({
          targetPath,
          content,
          relativePath,
          installDir: config.hooksFsPath,
        });
      }
    }

    const npmDeps = applyModeDeps(collectNpmDeps(resolved), mode, keyscopeVersionSpec);
    const installed = getInstalledDeps(cwd);
    const missing = npmDeps.filter((dep) => !installed.has(depName(dep)));

    if (!opts.yes) {
      const message = opts.all
        ? `Add ALL ${resolved.length} item(s) (${fileOps.length} files)?`
        : `Add ${resolved.length} item(s) (${fileOps.length} files)?`;

      const proceed = await promptConfirm(message);

      if (!proceed) {
        info("Cancelled.");
        return;
      }
    }

    if (opts.dryRun) {
      showDryRunPreview(fileOps, opts.overwrite);
      showDryRunDeps(missing);
      console.log();
      info("(dry run - no changes made)");
      return;
    }

    heading("Adding hooks...");
    const writeResult = writeFilesWithRollback(fileOps, opts.overwrite);

    await installDepsWithRollback(missing, cwd, writeResult);

    const manifestMetadata: ManifestInstallMetadata = {
      mode,
    };

    if (mode === "copy") {
      manifestMetadata.keyscopeVersion = VERSION;
    } else if (mode === "package" && keyscopeVersionSpec !== "latest") {
      manifestMetadata.keyscopeVersion = keyscopeVersionSpec;
    }

    updateManifest(cwd, resolved, undefined, manifestMetadata);

    console.log();
    success(formatWriteSummary(writeResult));
    console.log();
  }));
