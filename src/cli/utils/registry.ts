import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  z,
  RegistryContentFileSchema,
  RegistryContentItemSchema,
  BaseRegistryBundleSchema,
  createRegistryLoader,
  createRegistryAccessors,
} from "@b4r7/cli-core";
import { ITEM_LABEL } from "../constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type RegistryFile = z.infer<typeof RegistryContentFileSchema>;
export type RegistryItem = z.infer<typeof RegistryContentItemSchema>;
export type RegistryBundle = z.infer<typeof BaseRegistryBundleSchema>;

const getRegistry = createRegistryLoader(
  resolve(__dirname, "../generated/registry-bundle.json"),
  BaseRegistryBundleSchema,
  (bundle) => ({ items: bundle.items }),
);

const accessors = createRegistryAccessors({
  loader: getRegistry,
  itemLabel: ITEM_LABEL,
  pathPrefixes: ["registry/hooks/", "src/hooks/"],
  itemTypeFilter: "registry:hook",
});

export const getRegistryItem = accessors.getItem;
export const getPublicHooks = accessors.getPublicItems;
export const getAllHooks = accessors.getAllItems;
export const resolveRegistryDeps = accessors.resolveDeps;
export const getRelativePath = accessors.relativePath;
export const collectNpmDeps = accessors.npmDeps;
