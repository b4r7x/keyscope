import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  z,
  RegistryContentFileSchema,
  RegistryContentItemSchema,
  resolveRegistryDeps as coreResolveRegistryDeps,
  collectNpmDeps as coreCollectNpmDeps,
  getRelativePath as coreGetRelativePath,
  createRegistryLoader,
  metaField,
} from "@b4r7/cli-core";
import { ITEM_LABEL } from "../constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RegistryBundleSchema = z.object({
  items: z.array(RegistryContentItemSchema),
  integrity: z.string().optional(),
});

export type RegistryFile = z.infer<typeof RegistryContentFileSchema>;
export type RegistryItem = z.infer<typeof RegistryContentItemSchema>;
export type RegistryBundle = z.infer<typeof RegistryBundleSchema>;

const HOOK_ITEM_TYPE = "registry:hook";
const REGISTRY_HOOKS_PREFIXES = ["registry/hooks/", "src/hooks/"];

const getRegistry = createRegistryLoader(
  resolve(__dirname, "../generated/registry-bundle.json"),
  RegistryBundleSchema,
  (bundle) => ({ items: bundle.items }),
);

export function getRegistryItem(name: string): RegistryItem | undefined {
  return getRegistry().items.find((item) => item.name === name);
}

export function getPublicHooks(): RegistryItem[] {
  return getAllHooks().filter((item) => !metaField(item, "hidden", false));
}

export function getAllHooks(): RegistryItem[] {
  return getRegistry().items.filter((item) => item.type === HOOK_ITEM_TYPE);
}

export function resolveRegistryDeps(names: string[]): string[] {
  return coreResolveRegistryDeps(names, getRegistryItem, ITEM_LABEL);
}

export function getRelativePath(file: Pick<RegistryFile, "path" | "targetPath">): string {
  return coreGetRelativePath(file, REGISTRY_HOOKS_PREFIXES);
}

export function collectNpmDeps(names: string[]): string[] {
  return coreCollectNpmDeps(names, getRegistryItem);
}
