import { cpSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEYSCOPE_ROOT = resolve(PKG_DIR, "..");
const SOURCE = resolve(KEYSCOPE_ROOT, "dist/artifacts");
const TARGET = resolve(PKG_DIR, "dist/artifacts");

if (!existsSync(SOURCE)) {
  throw new Error(
    `keyscope artifacts not found at ${SOURCE}.\nRun: pnpm --filter keyscope build:artifacts`,
  );
}

rmSync(resolve(PKG_DIR, "dist"), { recursive: true, force: true });
mkdirSync(resolve(PKG_DIR, "dist"), { recursive: true });
cpSync(SOURCE, TARGET, { recursive: true });
console.log(`[keyscope-artifacts] copied artifacts from ${SOURCE}`);
