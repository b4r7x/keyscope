import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyArtifactsToPackage } from "@b4r7x/registry-kit";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEYSCOPE_ROOT = resolve(PKG_DIR, "..");

copyArtifactsToPackage({
  sourceRoot: KEYSCOPE_ROOT,
  packageRoot: PKG_DIR,
  label: "keyscope-artifacts",
  rebuildHint: "pnpm --filter keyscope build:artifacts",
});
