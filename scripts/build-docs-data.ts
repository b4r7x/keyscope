import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  createDocsHighlighter,
  generateHooksSource,
  generateEnrichedHookData,
  type HookDoc,
  type HookRegistryItem,
} from "@b4r7x/registry-kit"
import { DOCS_CODE_THEME_NAME, docsCodeTheme } from "../docs/code-theme.js"

const ROOT = resolve(import.meta.dirname, "..")
const REGISTRY_PATH = resolve(ROOT, "registry/registry.json")
const HOOK_DOCS_DIR = resolve(ROOT, "registry/hook-docs")
const EXAMPLES_DIR = resolve(ROOT, "registry/examples")
const OUTPUT_DIR = resolve(ROOT, "docs/generated")
const CONTENT_HOOKS_DIR = resolve(ROOT, "docs/content/hooks")

interface RegistryFile {
  path: string
  type: string
}

interface RegistryItem {
  name: string
  type: string
  title?: string
  description?: string
  dependencies?: string[]
  registryDependencies?: string[]
  meta?: { hidden?: boolean; client?: boolean }
  files: RegistryFile[]
}

interface Registry {
  name: string
  items: RegistryItem[]
}

/** Provider-dependent hooks not in registry.json (package-only). */
const PROVIDER_HOOKS: HookRegistryItem[] = [
  {
    name: "use-key",
    title: "useKey",
    description: "Bind keyboard shortcuts to handlers with scoped, document-level, or element-targeted listening",
    files: [{ path: "src/hooks/use-key.ts" }],
  },
  {
    name: "use-scope",
    title: "useScope",
    description: "Push a named scope onto the keyboard scope stack",
    files: [{ path: "src/hooks/use-scope.ts" }],
  },
  {
    name: "use-scoped-navigation",
    title: "useScopedNavigation",
    description: "Scope-aware keyboard navigation registered via KeyboardProvider",
    files: [{ path: "src/hooks/use-scoped-navigation.ts" }],
  },
  {
    name: "use-focus-zone",
    title: "useFocusZone",
    description: "Manage focus across multiple zones with arrow key and Tab transitions",
    files: [{ path: "src/hooks/use-focus-zone.ts" }],
  },
]

/**
 * Map registry item name to the hook-docs/examples directory name.
 * Registry items use short names (e.g., "navigation"), but hook-docs
 * and examples use "use-" prefixed names (e.g., "use-navigation").
 */
function toHookDirName(itemName: string): string {
  return itemName.startsWith("use-") ? itemName : `use-${itemName}`
}

/**
 * Convert a hook directory name to the expected HookDoc export name.
 * e.g., "use-key" → "useKeyDoc", "use-focus-trap" → "useFocusTrapDoc"
 */
function toDocExportName(hookDirName: string): string {
  const camelCase = hookDirName
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("")
  return `${camelCase}Doc`
}

/**
 * Convert a kebab-case hook name to a camelCase title (e.g., "use-scroll-lock" → "useScrollLock").
 */
function toHookTitle(hookDirName: string): string {
  return hookDirName
    .split("-")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("")
}

/** Format a string for YAML frontmatter. */
function toYamlString(value: string): string {
  return JSON.stringify(value)
}

/** Dynamically load a HookDoc from registry/hook-docs/{hookDirName}.ts */
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

async function main(): Promise<void> {
  const registry: Registry = await import(REGISTRY_PATH, { with: { type: "json" } })
    .then((m) => m.default as Registry)

  // Collect standalone hooks from registry (use "use-" prefixed names for consistency)
  const registryHooks: HookRegistryItem[] = registry.items
    .filter((item) => item.type === "registry:hook" && !item.meta?.hidden)
    .map((item) => ({
      name: toHookDirName(item.name),
      title: toHookTitle(toHookDirName(item.name)),
      description: item.description ?? "",
      files: item.files,
    }))

  // Merge registry hooks + provider hooks
  const allHooks = [...registryHooks, ...PROVIDER_HOOKS].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  console.log(`Found ${allHooks.length} hooks (${registryHooks.length} registry + ${PROVIDER_HOOKS.length} provider)`)

  // Create highlighter with shared theme
  const highlighter = await createDocsHighlighter({
    theme: docsCodeTheme,
    themeName: DOCS_CODE_THEME_NAME,
  })

  try {
    // Generate enriched data for all hooks
    const enrichedData = await generateEnrichedHookData({
      items: allHooks,
      rootDir: ROOT,
      highlighter,
      themeName: DOCS_CODE_THEME_NAME,
      loadHookDoc,
      examplesDir: EXAMPLES_DIR,
    })

    // Prepare output directories
    mkdirSync(OUTPUT_DIR, { recursive: true })
    const hooksDir = resolve(OUTPUT_DIR, "hooks")
    mkdirSync(hooksDir, { recursive: true })

    // Clear existing hook JSON files
    if (existsSync(hooksDir)) {
      for (const f of readdirSync(hooksDir)) {
        if (f.endsWith(".json")) {
          rmSync(resolve(hooksDir, f))
        }
      }
    }

    // Write per-hook enriched JSON
    for (const [name, data] of Object.entries(enrichedData)) {
      writeFileSync(resolve(hooksDir, `${name}.json`), JSON.stringify(data, null, 2))
    }
    console.log(`Wrote ${Object.keys(enrichedData).length} per-hook JSON files`)

    // Write hook-list.json index
    const hookList = Object.values(enrichedData)
      .map((h) => ({
        name: h.name,
        title: h.title,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    writeFileSync(
      resolve(OUTPUT_DIR, "hook-list.json"),
      JSON.stringify(hookList, null, 2)
    )
    console.log(`Wrote hook-list.json (${hookList.length} entries)`)

    // Generate MDX wrapper pages for each hook
    mkdirSync(CONTENT_HOOKS_DIR, { recursive: true })
    // Clear existing MDX files
    for (const f of readdirSync(CONTENT_HOOKS_DIR)) {
      if (f.endsWith(".mdx")) rmSync(resolve(CONTENT_HOOKS_DIR, f))
    }
    for (const hookData of Object.values(enrichedData)) {
      const description = hookData.docs?.description ?? hookData.description ?? ""
      writeFileSync(
        resolve(CONTENT_HOOKS_DIR, `${hookData.name}.mdx`),
        `---\ntitle: ${toYamlString(hookData.title)}\ndescription: ${toYamlString(description)}\nhook: ${toYamlString(hookData.name)}\n---\n\n<HookDocPage />\n`
      )
    }
    // Write meta.json for navigation ordering
    const metaPages = Object.values(enrichedData)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((h) => h.name)
    writeFileSync(
      resolve(CONTENT_HOOKS_DIR, "meta.json"),
      JSON.stringify({ title: "Hooks", pages: metaPages }, null, 2)
    )
    console.log(`Wrote ${Object.keys(enrichedData).length} hook MDX pages + meta.json`)

    // Generate backward-compatible keyscope-hooks.json (basic format, registry hooks only)
    const registryItemsOriginalNames: HookRegistryItem[] = registry.items
      .filter((item) => item.type === "registry:hook" && !item.meta?.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    const basicHooksData = generateHooksSource({
      items: registryItemsOriginalNames,
      rootDir: ROOT,
      highlighter,
      themeName: DOCS_CODE_THEME_NAME,
    })

    writeFileSync(
      resolve(OUTPUT_DIR, "keyscope-hooks.json"),
      JSON.stringify(basicHooksData, null, 2)
    )
    console.log(`Wrote keyscope-hooks.json (${Object.keys(basicHooksData).length} hooks)`)

    console.log("\n--- Build Summary ---")
    console.log(`Hooks: ${Object.keys(enrichedData).length}`)
    console.log("Errors: 0")
    console.log("Build completed successfully.")
  } finally {
    highlighter.dispose()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
