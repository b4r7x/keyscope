import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const VERSION: string = (require("../../package.json") as { version: string }).version;

export const CONFIG_FILE = "keyscope.json";
export const ITEM_LABEL = "Hook";
export const LIST_COMMAND = "npx keyscope list";
export const INIT_COMMAND = "npx keyscope init";
