import { resolve } from "node:path";
import { buildShadcnRegistryWithOrigin, REGISTRY_ORIGIN } from "@b4r7x/registry-kit";

const ROOT = resolve(import.meta.dirname, "..");

buildShadcnRegistryWithOrigin({ rootDir: ROOT, defaultOrigin: REGISTRY_ORIGIN });
