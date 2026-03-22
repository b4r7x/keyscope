import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRegistryArtifacts,
  createArtifactManifest,
} from "@b4r7x/registry-kit";

const REGISTRY_ORIGIN = "https://diffgazer.com";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const INPUTS = [
  "docs/content",
  "docs/assets",
  "docs/generated",
  "registry",
  "public/r",
  "internal-docs-manifest.json",
  "package.json",
];

function main(): void {
  const manifest = createArtifactManifest({
    rootDir: ROOT,
    library: "keyscope",
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
      hookList: "generated/hook-list.json",
      hooksDir: "generated/hooks",
      demoIndex: "generated/demo-index.ts",
    },
  });

  const copyDirs = [
    { from: "docs/content", to: "docs" },
    { from: "public/r", to: "registry" },
    { from: "registry", to: "source/registry" },
  ];

  const assetsDir = resolve(ROOT, "docs/assets");
  if (existsSync(assetsDir)) {
    copyDirs.push({ from: "docs/assets", to: "assets" });
  }

  copyDirs.push({ from: "docs/generated", to: "generated" });

  const result = buildRegistryArtifacts({
    rootDir: ROOT,
    manifest,
    defaultOrigin: REGISTRY_ORIGIN,
    ensurePublicRegistry: {
      fixCommand: "pnpm --dir keyscope build:shadcn",
      label: "keyscope public registry index",
    },
    requiredPaths: [
      { path: "docs/content", label: "keyscope docs content" },
      { path: "registry", label: "keyscope registry source" },
      { path: "public/r", label: "keyscope public registry" },
      { path: "public/r/registry.json", label: "keyscope public registry index" },
      { path: "docs/generated/keyscope-hooks.json", label: "keyscope hooks data (backward compat)" },
      { path: "docs/generated/hook-list.json", label: "keyscope hook list" },
    ],
    copyDirs,
    rewriteDirs: ["registry", "source/registry"],
    afterCopy: ({ artifactRoot }) => {
      // Verify expected generated files were copied
      const expectedFiles = ["generated/keyscope-hooks.json", "generated/hook-list.json"];
      for (const file of expectedFiles) {
        const filePath = resolve(artifactRoot, file);
        if (!existsSync(filePath)) {
          throw new Error(`Expected artifact file missing: ${file}`);
        }
      }
    },
  });

  console.log(`[keyscope] artifact manifest written: ${result.manifestPath}`);
  console.log(`[keyscope] artifact fingerprint: ${result.fingerprint}`);
}

main();
