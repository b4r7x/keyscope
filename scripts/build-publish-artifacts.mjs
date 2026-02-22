import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REGISTRY_ORIGIN = "https://diffgazer.com";

const ARTIFACT_ROOT = resolve(ROOT, "dist/artifacts");
const ARTIFACT_DOCS_DIR = resolve(ARTIFACT_ROOT, "docs");
const ARTIFACT_ASSETS_DIR = resolve(ARTIFACT_ROOT, "assets");
const ARTIFACT_GENERATED_DIR = resolve(ARTIFACT_ROOT, "generated");
const ARTIFACT_REGISTRY_DIR = resolve(ARTIFACT_ROOT, "registry");
const ARTIFACT_SOURCE_REGISTRY_DIR = resolve(ARTIFACT_ROOT, "source/registry");
const ARTIFACT_MANIFEST_PATH = resolve(ARTIFACT_ROOT, "artifact-manifest.json");
const ARTIFACT_FINGERPRINT_PATH = resolve(ARTIFACT_ROOT, "fingerprint.sha256");

const INPUTS = [
  "docs/content",
  "docs/assets",
  "registry",
  "public/r",
  "internal-docs-manifest.json",
  "package.json",
];

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} not found at "${path}"`);
  }
}

function resetDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function normalizeOrigin(raw) {
  const value = (raw ?? DEFAULT_REGISTRY_ORIGIN).trim();
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`REGISTRY_ORIGIN must start with http:// or https:// (received "${value}")`);
  }
  return value.replace(/\/+$/, "");
}

function relative(base, filePath) {
  return filePath.startsWith(`${base}/`) ? filePath.slice(base.length + 1) : filePath;
}

function collectAllFiles(rootDir, out = []) {
  for (const entry of readdirSync(rootDir)) {
    const fullPath = resolve(rootDir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectAllFiles(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function collectJsonFiles(rootDir, out = []) {
  for (const entry of readdirSync(rootDir)) {
    const fullPath = resolve(rootDir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectJsonFiles(fullPath, out);
      continue;
    }
    if (fullPath.endsWith(".json")) {
      out.push(fullPath);
    }
  }
  return out;
}

function rewriteOrigin(value, origin) {
  if (typeof value === "string") {
    return value.replaceAll(DEFAULT_REGISTRY_ORIGIN, origin);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteOrigin(item, origin));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewriteOrigin(v, origin)]),
    );
  }
  return value;
}

function rewriteOriginsInDir(dir, origin) {
  for (const jsonFile of collectJsonFiles(dir)) {
    const raw = JSON.parse(readFileSync(jsonFile, "utf-8"));
    const rewritten = rewriteOrigin(raw, origin);
    writeFileSync(jsonFile, `${JSON.stringify(rewritten, null, 2)}\n`);
  }
}

function ensureSameStringArray(label, a, b, itemName) {
  const left = JSON.stringify(a ?? []);
  const right = JSON.stringify(b ?? []);
  if (left !== right) {
    throw new Error(
      `Public registry is stale for "${itemName}" (${label} mismatch). Run \`pnpm --dir keyscope build:shadcn\`.`,
    );
  }
}

function validatePublicRegistryFresh() {
  const sourceRegistry = JSON.parse(readFileSync(resolve(ROOT, "registry/registry.json"), "utf-8"));
  const publicRegistry = JSON.parse(readFileSync(resolve(ROOT, "public/r/registry.json"), "utf-8"));
  const sourceItems = sourceRegistry.items ?? [];
  const publicItems = publicRegistry.items ?? [];
  const publicByName = new Map(publicItems.map((item) => [item.name, item]));

  if (sourceItems.length !== publicItems.length) {
    throw new Error(
      "Public registry item count does not match source registry. Run `pnpm --dir keyscope build:shadcn`.",
    );
  }

  for (const sourceItem of sourceItems) {
    const publicItem = publicByName.get(sourceItem.name);
    if (!publicItem) {
      throw new Error(
        `Public registry missing item "${sourceItem.name}". Run \`pnpm --dir keyscope build:shadcn\`.`,
      );
    }

    ensureSameStringArray("dependencies", sourceItem.dependencies, publicItem.dependencies, sourceItem.name);
    ensureSameStringArray(
      "registryDependencies",
      sourceItem.registryDependencies,
      publicItem.registryDependencies,
      sourceItem.name,
    );

    const publicItemPath = resolve(ROOT, "public/r", `${sourceItem.name}.json`);
    ensureExists(
      publicItemPath,
      `public registry item JSON (${sourceItem.name})`,
    );
    const publicItemJson = JSON.parse(readFileSync(publicItemPath, "utf-8"));
    const publicFilesByPath = new Map((publicItemJson.files ?? []).map((file) => [file.path, file]));
    for (const sourceFile of sourceItem.files ?? []) {
      const sourcePath = resolve(ROOT, sourceFile.path);
      ensureExists(sourcePath, `source registry file (${sourceItem.name})`);
      const sourceContent = readFileSync(sourcePath, "utf-8");
      const publicFile = publicFilesByPath.get(sourceFile.path);

      if (!publicFile || typeof publicFile.content !== "string") {
        throw new Error(
          `Public registry file "${sourceFile.path}" missing for "${sourceItem.name}". Run \`pnpm --dir keyscope build:shadcn\`.`,
        );
      }

      if (publicFile.content !== sourceContent) {
        throw new Error(
          `Public registry file content is stale for "${sourceFile.path}" (${sourceItem.name}). Run \`pnpm --dir keyscope build:shadcn\`.`,
        );
      }
    }
  }
}

function computeFingerprint() {
  const hash = createHash("sha256");
  for (const relativeInput of INPUTS) {
    const absoluteInput = resolve(ROOT, relativeInput);
    if (!existsSync(absoluteInput)) continue;

    const stats = statSync(absoluteInput);
    if (stats.isDirectory()) {
      const files = collectAllFiles(absoluteInput).sort((a, b) => a.localeCompare(b));
      for (const filePath of files) {
        hash.update(relative(ROOT, filePath));
        hash.update("\n");
        hash.update(readFileSync(filePath));
        hash.update("\n");
      }
      continue;
    }

    hash.update(relativeInput);
    hash.update("\n");
    hash.update(readFileSync(absoluteInput));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function toCodeBlockLines(raw) {
  return raw.split("\n").map((line, index) => ({
    number: index + 1,
    content: line,
  }));
}

function generateKeyscopeHooksData() {
  const registryPath = resolve(ROOT, "registry/registry.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  const hooks = registry.items
    .filter((item) => item.type === "registry:hook" && item.meta?.hidden !== true)
    .sort((a, b) => a.name.localeCompare(b.name));

  const data = {};
  for (const item of hooks) {
    const firstFile = item.files[0];
    if (!firstFile?.path) continue;
    const sourcePath = resolve(ROOT, firstFile.path);
    if (!existsSync(sourcePath)) {
      throw new Error(`Hook source file not found for "${item.name}": ${sourcePath}`);
    }

    const raw = readFileSync(sourcePath, "utf-8");
    data[item.name] = {
      name: item.name,
      title: item.title ?? item.name,
      description: item.description ?? "",
      source: {
        raw,
        highlighted: toCodeBlockLines(raw),
      },
    };
  }
  return data;
}

function main() {
  ensureExists(resolve(ROOT, "docs/content"), "keyscope docs content");
  ensureExists(resolve(ROOT, "registry"), "keyscope registry source");
  ensureExists(resolve(ROOT, "public/r"), "keyscope public registry");
  ensureExists(resolve(ROOT, "public/r/registry.json"), "keyscope public registry index");
  validatePublicRegistryFresh();

  const origin = normalizeOrigin(process.env.REGISTRY_ORIGIN);
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));

  resetDir(ARTIFACT_ROOT);
  resetDir(ARTIFACT_GENERATED_DIR);
  cpSync(resolve(ROOT, "docs/content"), ARTIFACT_DOCS_DIR, { recursive: true });
  cpSync(resolve(ROOT, "public/r"), ARTIFACT_REGISTRY_DIR, { recursive: true });
  cpSync(resolve(ROOT, "registry"), ARTIFACT_SOURCE_REGISTRY_DIR, { recursive: true });

  const assetsDir = resolve(ROOT, "docs/assets");
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, ARTIFACT_ASSETS_DIR, { recursive: true });
  }

  rewriteOriginsInDir(ARTIFACT_REGISTRY_DIR, origin);
  rewriteOriginsInDir(ARTIFACT_SOURCE_REGISTRY_DIR, origin);

  const hooksData = generateKeyscopeHooksData();
  writeFileSync(
    resolve(ARTIFACT_GENERATED_DIR, "keyscope-hooks.json"),
    `${JSON.stringify(hooksData, null, 2)}\n`,
  );

  const fingerprint = computeFingerprint();
  const manifest = {
    schemaVersion: 1,
    library: "keyscope",
    package: pkg.name ?? "keyscope",
    version: pkg.version ?? "0.0.0",
    artifactRoot: "dist/artifacts",
    inputs: INPUTS,
    docs: {
      contentDir: "docs",
      metaFile: "docs/meta.json",
      assetsDir: "assets",
      generatedDir: "generated",
    },
    registry: {
      namespace: "@keyscope",
      basePath: "/r/keyscope",
      publicDir: "registry",
      index: "registry/registry.json",
    },
    source: {
      registryDir: "source/registry",
    },
    generated: {
      keyscopeHooksFile: "generated/keyscope-hooks.json",
    },
    integrity: {
      algorithm: "sha256",
      fingerprintFile: "fingerprint.sha256",
    },
  };

  writeFileSync(ARTIFACT_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(ARTIFACT_FINGERPRINT_PATH, `${fingerprint}\n`);
  writeFileSync(
    resolve(ARTIFACT_ROOT, "docs-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(`[keyscope] artifact manifest written: ${ARTIFACT_MANIFEST_PATH}`);
  console.log(`[keyscope] artifact fingerprint: ${fingerprint}`);
}

main();
