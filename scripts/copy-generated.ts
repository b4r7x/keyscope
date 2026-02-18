import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyGeneratedDir } from "@b4r7/cli-core";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
copyGeneratedDir(pkgRoot, "src/cli/generated", "dist/cli/generated");
