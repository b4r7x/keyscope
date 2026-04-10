import { resolve } from "node:path";
import { copyArtifactsToPackage } from "@b4r7x/registry-kit";

const PKG_DIR = resolve(import.meta.dirname, "..");
const KEYSCOPE_ROOT = resolve(PKG_DIR, "..");

copyArtifactsToPackage({
  sourceRoot: KEYSCOPE_ROOT,
  packageRoot: PKG_DIR,
  label: "keyscope-artifacts",
  rebuildHint: "pnpm --filter keyscope build:artifacts",
});
