import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRegistryArtifacts,
} from "@b4r7x/registry-kit";

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

function main() {
  // Generate enriched hook data (docs/generated/) before building artifacts
  console.log("[keyscope] generating enriched hook data...");
  execSync("node --import tsx scripts/build-docs-data.ts", { cwd: ROOT, stdio: "inherit" });
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
      hookList: "generated/hook-list.json",
      hooksDir: "generated/hooks",
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

  copyDirs.push({ from: "docs/generated", to: "generated" });

  const result = buildRegistryArtifacts({
    rootDir: ROOT,
    inputs: INPUTS,
    manifest,
    defaultOrigin: "https://diffgazer.com",
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
