import { resolve } from "node:path";
import { loadResolvedConfig, getManifestHooks } from "./config.js";
import { getRegistryItem, getRelativePath } from "./registry.js";
import {
  createItemAccessors,
  createInstallChecker,
} from "@b4r7/cli-core";
import { CONFIG_FILE, ITEM_LABEL, LIST_COMMAND, INIT_COMMAND } from "../constants.js";

const { requireConfig, getOrThrow: getHookOrThrow, validate: validateHooks } =
  createItemAccessors({
    configFileName: CONFIG_FILE,
    initCommand: INIT_COMMAND,
    itemLabel: ITEM_LABEL,
    listCommand: LIST_COMMAND,
    loadResolved: loadResolvedConfig,
    getItem: getRegistryItem,
  });

export { requireConfig, getHookOrThrow, validateHooks };

export function createHookInstallChecker(cwd: string, hooksFsPath: string): (name: string) => boolean {
  return createInstallChecker({
    getManifest: () => getManifestHooks(cwd),
    getItem: getRegistryItem,
    getRelativePath,
    installDir: resolve(cwd, hooksFsPath),
    extensions: [],
  });
}
