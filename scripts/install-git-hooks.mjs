#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const gitDir = join(repoRoot, ".git");
const hooksDir = join(gitDir, "hooks");
const sourceHook = join(repoRoot, ".githooks", "pre-push");
const targetHook = join(hooksDir, "pre-push");
const backupHook = join(hooksDir, "pre-push.local-existing");

const MARKER = "# keypilot-local-ci-guardrail";

function log(message) {
  console.log(`[hooks] ${message}`);
}

function ensureExecutable(path) {
  try {
    chmodSync(path, 0o755);
  } catch {
    // Ignore chmod issues on unsupported filesystems.
  }
}

function installNewHook() {
  copyFileSync(sourceHook, targetHook);
  ensureExecutable(targetHook);
  log("Installed .git/hooks/pre-push");
}

function mergeWithExistingHook(existingContent) {
  if (existingContent.includes(MARKER)) {
    log("pre-push hook already includes local CI guardrail");
    return;
  }

  if (!existsSync(backupHook)) {
    writeFileSync(backupHook, existingContent, "utf8");
    ensureExecutable(backupHook);
    log("Backed up existing pre-push hook to pre-push.local-existing");
  }

  const merged = `#!/usr/bin/env bash
set -euo pipefail

${MARKER}
existing_hook=".git/hooks/pre-push.local-existing"
if [ -f "$existing_hook" ]; then
  bash "$existing_hook" "$@"
fi

bash ".githooks/pre-push" "$@"
`;
  writeFileSync(targetHook, merged, "utf8");
  ensureExecutable(targetHook);
  log("Merged existing pre-push hook with local CI guardrail");
}

function main() {
  if (!existsSync(gitDir)) {
    log("Skipping hook install (no .git directory found)");
    process.exit(0);
  }
  if (!existsSync(sourceHook)) {
    log("Skipping hook install (.githooks/pre-push not found)");
    process.exit(0);
  }
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  if (!existsSync(targetHook)) {
    installNewHook();
    process.exit(0);
  }

  const existing = readFileSync(targetHook, "utf8");
  mergeWithExistingHook(existing);
}

main();
