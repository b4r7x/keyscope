import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_ORIGIN = "https://diffgazer.com";

function normalizeOrigin(raw) {
  const value = (raw ?? DEFAULT_ORIGIN).trim();
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`REGISTRY_ORIGIN must start with http:// or https:// (received "${value}")`);
  }
  return value.replace(/\/+$/, "");
}

function collectJsonFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
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

function rewriteValue(value, origin) {
  if (typeof value === "string") {
    return value.replaceAll(DEFAULT_ORIGIN, origin);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteValue(item, origin));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rewriteValue(item, origin)]),
    );
  }
  return value;
}

function main() {
  const targetArg = process.argv[2] ?? "public/r";
  const targetDir = resolve(process.cwd(), targetArg);
  if (!existsSync(targetDir)) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  const origin = normalizeOrigin(process.env.REGISTRY_ORIGIN);
  const jsonFiles = collectJsonFiles(targetDir);
  let changed = 0;

  for (const filePath of jsonFiles) {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const rewritten = rewriteValue(parsed, origin);
    const next = JSON.stringify(rewritten, null, 2) + "\n";
    if (next !== raw) {
      writeFileSync(filePath, next);
      changed++;
    }
  }

  console.log(
    `Rewrote registry origin in ${changed}/${jsonFiles.length} JSON files (${origin})`,
  );
}

main();
