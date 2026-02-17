import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PEER_DEPS = new Set(["react", "react-dom"]);

const RegistrySourceItemSchema = z.object({
  name: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()).optional().default([]),
  registryDependencies: z.array(z.string()).optional().default([]),
  files: z.array(z.object({ path: z.string() })),
  client: z.boolean().optional(),
  hidden: z.boolean().optional(),
  optionalIntegrations: z.array(z.string()).optional().default([]),
});

const RegistrySourceSchema = z.object({
  items: z.array(RegistrySourceItemSchema),
});

function detectNpmImports(content: string): string[] {
  const ALIAS_PREFIXES = ["@/", "./", "../", "node:"];
  const imports: string[] = [];
  for (const line of content.split("\n")) {
    if (/^\s*import\s+type\s/.test(line)) continue;
    if (/^\s*export\s+type\s/.test(line)) continue;
    const match = /from\s+["']([^"']+)["']/.exec(line);
    if (!match) continue;
    const pkg = match[1]!;
    if (ALIAS_PREFIXES.some(p => pkg.startsWith(p))) continue;
    const parts = pkg.split("/");
    const pkgName = pkg.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]!;
    if (!PEER_DEPS.has(pkgName)) imports.push(pkgName);
  }
  return [...new Set(imports)];
}

/** Rewrites `src/hooks/foo.ts` → `registry/hooks/foo.ts` */
function toBundlePath(originalPath: string): string {
  if (originalPath.startsWith("src/hooks/")) {
    return originalPath.replace(/^src\/hooks\//, "registry/hooks/");
  }
  return originalPath;
}

interface BundleFile {
  path: string;
  content: string;
}

interface BundleItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: BundleFile[];
  // keyscope hooks default to client: true (React hooks are always client-side)
  client: boolean;
  hidden: boolean;
  optionalIntegrations: string[];
}

interface Bundle {
  items: BundleItem[];
  integrity?: string;
}

function main() {
  console.log("Bundling registry...");

  const registryPath = resolve(ROOT, "registry/registry.json");
  if (!existsSync(registryPath)) {
    console.error(`Error: registry.json not found at ${registryPath}.`);
    process.exit(1);
  }

  let registryRaw: unknown;
  try {
    registryRaw = JSON.parse(readFileSync(registryPath, "utf-8"));
  } catch (e) {
    console.error(`Error: Failed to parse registry.json: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const parsed = RegistrySourceSchema.safeParse(registryRaw);
  if (!parsed.success) {
    console.error("Error: Invalid registry.json schema:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const { items: sourceItems } = parsed.data;

  const names = new Set<string>();
  for (const item of sourceItems) {
    if (names.has(item.name)) {
      console.error(`Error: Duplicate hook name: "${item.name}"`);
      process.exit(1);
    }
    names.add(item.name);
  }

  for (const item of sourceItems) {
    for (const dep of item.registryDependencies) {
      if (!names.has(dep)) {
        console.error(`Error: "${item.name}" has registryDependency "${dep}" which doesn't exist`);
        process.exit(1);
      }
    }
  }

  const items: BundleItem[] = [];

  for (const item of sourceItems) {
    const files: BundleFile[] = [];
    const allDetectedDeps = new Set<string>(item.dependencies);

    for (const file of item.files) {
      const filePath = resolve(ROOT, file.path);
      if (!existsSync(filePath)) {
        console.error(`Error: File not found for hook "${item.name}": ${file.path}`);
        console.error(`  Expected at: ${filePath}`);
        process.exit(1);
      }
      const content = readFileSync(filePath, "utf-8");
      files.push({ path: toBundlePath(file.path), content });

      for (const dep of detectNpmImports(content)) {
        allDetectedDeps.add(dep);
      }
    }

    items.push({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      dependencies: [...allDetectedDeps],
      registryDependencies: item.registryDependencies,
      files,
      // keyscope hooks default to client: true (React hooks are always client-side)
      client: item.client ?? true,
      hidden: item.hidden ?? false,
      optionalIntegrations: item.optionalIntegrations,
    });
  }

  const contentForHash = JSON.stringify({ items });
  const integrity = "sha256-" + createHash("sha256").update(contentForHash).digest("hex");

  const bundle: Bundle = { items, integrity };
  const bundleJson = JSON.stringify(bundle);

  const outDir = resolve(__dirname, "../src/cli/generated");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "registry-bundle.json");
  const tmpPath = outPath + ".tmp";
  writeFileSync(tmpPath, bundleJson);
  renameSync(tmpPath, outPath);

  const totalFiles = items.reduce((acc, i) => acc + i.files.length, 0);
  const sizeKb = (Buffer.byteLength(bundleJson) / 1024).toFixed(1);
  console.log(`  Bundled ${items.length} hooks (${totalFiles} files)`);
  console.log(`  Bundle size: ${sizeKb} KB`);
  console.log(`  Integrity: ${integrity}`);
  console.log(`  Output: ${outPath}`);
}

main();
