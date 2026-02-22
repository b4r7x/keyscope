import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function resolveLocalShadcnBin() {
  const candidates = [
    resolve(ROOT, "node_modules/.bin/shadcn"),
    resolve(ROOT, "../node_modules/.bin/shadcn"),
    resolve(ROOT, "../../node_modules/.bin/shadcn"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function main() {
  const localBin = resolveLocalShadcnBin();
  const args = ["build", "registry/registry.json", "--output", "public/r"];
  const networkVersion = (process.env.SHADCN_CLI_VERSION ?? "latest").trim() || "latest";

  if (localBin) {
    run(localBin, args);
    return;
  }

  if (process.env.ALLOW_NETWORK_SHADCN === "1") {
    run("npx", [`shadcn@${networkVersion}`, ...args]);
    return;
  }

  throw new Error(
    [
      "Local shadcn CLI binary not found.",
      "Install dependencies so node_modules/.bin/shadcn exists,",
      "or opt in to network fallback with ALLOW_NETWORK_SHADCN=1.",
      "Optional: set SHADCN_CLI_VERSION (default: latest).",
    ].join("\n"),
  );
}

main();
