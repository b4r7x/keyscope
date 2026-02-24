import { resolve } from "node:path";
import { loadResolvedConfig, getManifestHooks, type ResolvedConfig } from "./config.js";
import { getRegistryItem, getRelativePath, type RegistryItem } from "./registry.js";
import {
  createRequireConfig,
  createInstallChecker,
  getItemOrThrow as coreGetItemOrThrow,
  validateItems as coreValidateItems,
} from "@b4r7/cli-core";
import { CONFIG_FILE, ITEM_LABEL, LIST_COMMAND, INIT_COMMAND } from "../constants.js";

export const requireConfig = createRequireConfig<unknown, ResolvedConfig>({
  configFileName: CONFIG_FILE,
  initCommand: INIT_COMMAND,
  loadResolved: loadResolvedConfig,
});

export function getHookOrThrow(name: string): RegistryItem {
  return coreGetItemOrThrow(name, getRegistryItem, ITEM_LABEL, LIST_COMMAND);
}

export function validateHooks(names: string[]): void {
  coreValidateItems(names, getRegistryItem, ITEM_LABEL, LIST_COMMAND);
}

export function createHookInstallChecker(cwd: string, hooksFsPath: string): (name: string) => boolean {
  return createInstallChecker({
    getManifest: () => getManifestHooks(cwd),
    getItem: getRegistryItem,
    getRelativePath: (file) => getRelativePath(file),
    installDir: resolve(cwd, hooksFsPath),
    extensions: [],
  });
}
