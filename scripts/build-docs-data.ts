import { existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildDocsData,
  toDocExportName,
  kebabToCamelCase,
  type HookDoc,
  type HookRegistryItem,
  type RegistryItem,
} from "@b4r7x/registry-kit"

const ROOT = resolve(import.meta.dirname, "..")
const HOOK_DOCS_DIR = resolve(ROOT, "registry/hook-docs")

function toHookDirName(name: string): string {
  return name.startsWith("use-") ? name : `use-${name}`
}

async function loadHookDoc(itemName: string): Promise<HookDoc | null> {
  const hookDirName = toHookDirName(itemName)
  const docPath = resolve(HOOK_DOCS_DIR, `${hookDirName}.ts`)
  if (!existsSync(docPath)) return null

  const mod = await import(docPath) as Record<string, unknown>
  const exportName = toDocExportName(hookDirName)
  const doc = mod[exportName]
  if (!doc) {
    console.warn(`  Warning: ${docPath} does not export "${exportName}"`)
    return null
  }
  return doc as HookDoc
}

const PROVIDER_HOOKS: HookRegistryItem[] = [
  { name: "use-key", title: "useKey", description: "Bind keyboard shortcuts to handlers with scoped, document-level, or element-targeted listening", files: [{ path: "src/hooks/use-key.ts" }] },
  { name: "use-scope", title: "useScope", description: "Push a named scope onto the keyboard scope stack", files: [{ path: "src/hooks/use-scope.ts" }] },
  { name: "use-scoped-navigation", title: "useScopedNavigation", description: "Scope-aware keyboard navigation registered via KeyboardProvider", files: [{ path: "src/hooks/use-scoped-navigation.ts" }] },
  { name: "use-focus-zone", title: "useFocusZone", description: "Manage focus across multiple zones with arrow key and Tab transitions", files: [{ path: "src/hooks/use-focus-zone.ts" }] },
]

buildDocsData({
  libraryId: "keyscope",
  rootDir: ROOT,
  registryPath: resolve(ROOT, "registry/registry.json"),
  examplesDir: resolve(ROOT, "registry/examples"),
  outputDir: resolve(ROOT, "docs/generated"),
  hooks: {
    contentDir: resolve(ROOT, "docs/content/hooks"),
    extraItems: PROVIDER_HOOKS,
    filter: (item) => item.type === "registry:hook" && !item.meta?.hidden,
    mapItem: (item: RegistryItem): HookRegistryItem => ({
      name: toHookDirName(item.name),
      title: kebabToCamelCase(toHookDirName(item.name)),
      description: item.description ?? "",
      files: item.files,
    }),
    loadHookDoc,
    backwardCompatFile: "keyscope-hooks.json",
  },
  demoIndex: {
    importPathPrefix: "../../../registry/examples/keyscope",
  },
}).catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
