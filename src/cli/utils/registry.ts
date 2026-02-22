import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  z,
  RegistryFileSchema as CoreRegistryFileSchema,
  RegistryItemSchema as CoreRegistryItemSchema,
  resolveRegistryDeps as coreResolveRegistryDeps,
  collectNpmDeps as coreCollectNpmDeps,
  getRelativePath as coreGetRelativePath,
  createRegistryLoader,
} from "@b4r7/cli-core";
import { ITEM_LABEL } from "../constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function metaField<T>(item: unknown, key: string, fallback: T): T {
  const value = (item as { meta?: Record<string, unknown> } | undefined)?.meta?.[key];
  return value !== undefined ? (value as T) : fallback;
}

const RegistryFileSchema = CoreRegistryFileSchema.extend({
  content: z.string(),
});

const RegistryItemSchema = CoreRegistryItemSchema.extend({
  files: z.array(RegistryFileSchema),
});

const RegistryBundleSchema = z.object({
  items: z.array(RegistryItemSchema),
  integrity: z.string().optional(),
});

export type RegistryFile = z.infer<typeof RegistryFileSchema>;
export type RegistryItem = z.infer<typeof RegistryItemSchema>;
export type RegistryBundle = z.infer<typeof RegistryBundleSchema>;

const REGISTRY_HOOKS_PREFIX = "registry/hooks/";

const getRegistry = createRegistryLoader(
  resolve(__dirname, "../generated/registry-bundle.json"),
  RegistryBundleSchema,
  (bundle) => ({ items: bundle.items }),
);

export function getRegistryItem(name: string): RegistryItem | undefined {
  return getRegistry().items.find((item) => item.name === name);
}

export function getPublicHooks(): RegistryItem[] {
  return getRegistry().items.filter((item) => item.type === "registry:hook" && !metaField(item, "hidden", false));
}

export function getAllHooks(): RegistryItem[] {
  return getRegistry().items.filter((item) => item.type === "registry:hook");
}

export function resolveRegistryDeps(names: string[]): string[] {
  return coreResolveRegistryDeps(names, getRegistryItem, ITEM_LABEL);
}

export function getRelativePath(file: { path: string }): string {
  return coreGetRelativePath(file, [REGISTRY_HOOKS_PREFIX]);
}

export function collectNpmDeps(names: string[]): string[] {
  return coreCollectNpmDeps(names, getRegistryItem);
}
