import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildShadcnRegistryWithOrigin,
} from "@b4r7/cli-core/artifacts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

buildShadcnRegistryWithOrigin({ rootDir: ROOT });
