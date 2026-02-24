import { parseEnumOption } from "@b4r7/cli-core";

export type AddMode = "copy" | "package";
const VALID_MODES = ["copy", "package"] as const;

export function parseMode(raw: unknown): AddMode {
  return parseEnumOption(String(raw ?? "copy").toLowerCase(), VALID_MODES, "--mode");
}

export function applyModeDeps(deps: string[], mode: AddMode, keyscopeVersionSpec: string): string[] {
  const depSet = new Set(deps.filter((dep) => !dep.startsWith("keyscope@")));

  if (mode === "copy") {
    depSet.delete("keyscope");
    return [...depSet];
  }

  depSet.delete("keyscope");
  depSet.add(keyscopeVersionSpec === "latest" ? "keyscope" : `keyscope@${keyscopeVersionSpec}`);

  return [...depSet];
}
