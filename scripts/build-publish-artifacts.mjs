import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRegistryArtifacts,
} from "@b4r7x/registry-kit";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const INPUTS = [
  "docs/content",
  "docs/assets",
  "registry",
  "public/r",
  "internal-docs-manifest.json",
  "package.json",
];

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
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
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

  const copyDirs = [
    { from: "docs/content", to: "docs" },
    { from: "public/r", to: "registry" },
    { from: "registry", to: "source/registry" },
  ];

  const assetsDir = resolve(ROOT, "docs/assets");
  if (existsSync(assetsDir)) {
    copyDirs.push({ from: "docs/assets", to: "assets" });
  }

  const result = buildRegistryArtifacts({
    rootDir: ROOT,
    inputs: INPUTS,
    manifest,
    ensurePublicRegistry: {
      fixCommand: "pnpm --dir keyscope build:shadcn",
      label: "keyscope public registry index",
    },
    requiredPaths: [
      { path: "docs/content", label: "keyscope docs content" },
      { path: "registry", label: "keyscope registry source" },
      { path: "public/r", label: "keyscope public registry" },
      { path: "public/r/registry.json", label: "keyscope public registry index" },
    ],
    copyDirs,
    rewriteDirs: ["registry", "source/registry"],
    afterCopy: ({ artifactRoot }) => {
      const generatedDir = resolve(artifactRoot, "generated");
      mkdirSync(generatedDir, { recursive: true });
      const hooksData = generateKeyscopeHooksData();
      writeFileSync(
        resolve(generatedDir, "keyscope-hooks.json"),
        `${JSON.stringify(hooksData, null, 2)}\n`,
      );
    },
  });

  console.log(`[keyscope] artifact manifest written: ${result.manifestPath}`);
  console.log(`[keyscope] artifact fingerprint: ${result.fingerprint}`);
}

main();
