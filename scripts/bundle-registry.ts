import { resolve } from "node:path";
import { createBundler } from "@b4r7/cli-core";

const ROOT = resolve(import.meta.dirname, "..");

const bundle = createBundler({
  rootDir: ROOT,
  outputPath: resolve(ROOT, "src/cli/generated/registry-bundle.json"),
  clientDefault: true,
  itemLabel: "hook",
  peerDeps: new Set(["react", "react-dom"]),
});

bundle();
