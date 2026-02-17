import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");
const src = resolve(pkgRoot, "src/cli/generated");
if (!existsSync(src)) {
  console.error("Error: src/cli/generated/ not found. Run prebuild first.");
  process.exit(1);
}
cpSync(src, resolve(pkgRoot, "dist/cli/generated"), { recursive: true, force: true });
