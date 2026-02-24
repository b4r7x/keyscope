export type AddMode = "copy" | "package";

export function parseMode(raw: unknown): AddMode {
  const mode = String(raw ?? "copy").toLowerCase();
  if (mode === "copy" || mode === "package") {
    return mode;
  }

  throw new Error(`Invalid value for --mode: "${raw}". Expected one of: copy, package.`);
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
