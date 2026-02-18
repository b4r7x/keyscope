import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createBundler } from "@b4r7/cli-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const bundle = createBundler({
  rootDir: ROOT,
  outputPath: resolve(ROOT, "src/cli/generated/registry-bundle.json"),
  clientDefault: true,
  itemLabel: "hook",
  transformPath: (path) =>
    path.startsWith("src/hooks/")
      ? path.replace(/^src\/hooks\//, "registry/hooks/")
      : path,
});

bundle();
