import { resolve } from "node:path";
import { copyGeneratedDir } from "@b4r7/cli-core";

const pkgRoot = resolve(import.meta.dirname, "..");
copyGeneratedDir(pkgRoot, "src/cli/generated", "dist/cli/generated");
