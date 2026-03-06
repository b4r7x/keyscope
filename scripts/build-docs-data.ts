import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  createDocsHighlighter,
  generateHooksSource,
  generateEnrichedHookData,
  docsCodeTheme,
  DOCS_CODE_THEME_NAME,
  toDocExportName,
  toYamlString,
  kebabToCamelCase,
  type HookDoc,
  type HookRegistryItem,
  type RegistryItem,
  type Registry,
} from "@b4r7x/registry-kit"

const ROOT = resolve(import.meta.dirname, "..")
const REGISTRY_PATH = resolve(ROOT, "registry/registry.json")
const HOOK_DOCS_DIR = resolve(ROOT, "registry/hook-docs")
const EXAMPLES_DIR = resolve(ROOT, "registry/examples")
const OUTPUT_DIR = resolve(ROOT, "docs/generated")
const CONTENT_HOOKS_DIR = resolve(ROOT, "docs/content/hooks")

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

function toHookDirName(itemName: string): string {
  return itemName.startsWith("use-") ? itemName : `use-${itemName}`
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

async function main(): Promise<void> {
  const registry: Registry = await import(REGISTRY_PATH, { with: { type: "json" } })
    .then((m) => m.default as Registry)

  const registryHooks: HookRegistryItem[] = registry.items
    .filter((item) => item.type === "registry:hook" && !item.meta?.hidden)
    .map((item) => ({
      name: toHookDirName(item.name),
      title: kebabToCamelCase(toHookDirName(item.name)),
      description: item.description ?? "",
      files: item.files,
    }))

  const allHooks = [...registryHooks, ...PROVIDER_HOOKS].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  console.log(`Found ${allHooks.length} hooks (${registryHooks.length} registry + ${PROVIDER_HOOKS.length} provider)`)

  const highlighter = await createDocsHighlighter({
    theme: docsCodeTheme,
    themeName: DOCS_CODE_THEME_NAME,
  })

  try {
    const enrichedData = await generateEnrichedHookData({
      items: allHooks,
      rootDir: ROOT,
      highlighter,
      themeName: DOCS_CODE_THEME_NAME,
      loadHookDoc,
      examplesDir: EXAMPLES_DIR,
    })

    mkdirSync(OUTPUT_DIR, { recursive: true })
    const hooksDir = resolve(OUTPUT_DIR, "hooks")
    mkdirSync(hooksDir, { recursive: true })

    if (existsSync(hooksDir)) {
      for (const f of readdirSync(hooksDir)) {
        if (f.endsWith(".json")) {
          rmSync(resolve(hooksDir, f))
        }
      }
    }

    for (const [name, data] of Object.entries(enrichedData)) {
      writeFileSync(resolve(hooksDir, `${name}.json`), JSON.stringify(data, null, 2))
    }
    console.log(`Wrote ${Object.keys(enrichedData).length} per-hook JSON files`)

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

    mkdirSync(CONTENT_HOOKS_DIR, { recursive: true })
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
    const metaPages = Object.values(enrichedData)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((h) => h.name)
    writeFileSync(
      resolve(CONTENT_HOOKS_DIR, "meta.json"),
      JSON.stringify({ title: "Hooks", pages: metaPages }, null, 2)
    )
    console.log(`Wrote ${Object.keys(enrichedData).length} hook MDX pages + meta.json`)

    // backward-compat format consumed by docs app
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
