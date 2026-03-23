export type AddMode = "copy" | "package";

export function applyModeDeps(deps: string[], mode: AddMode, keyscopeVersionSpec: string): string[] {
  const depSet = new Set(deps.filter((dep) => !dep.startsWith("keyscope@")));
  depSet.delete("keyscope");

  if (mode === "package") {
    depSet.add(keyscopeVersionSpec === "latest" ? "keyscope" : `keyscope@${keyscopeVersionSpec}`);
  }

  return [...depSet];
}
