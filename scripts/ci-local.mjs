#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const steps = [
  { key: "db-safety", label: "DB safety validator", command: "npm", args: ["run", "validate:db-safety"] },
  { key: "prisma-validate", label: "Prisma schema validate", command: "npx", args: ["prisma", "validate"] },
  { key: "prisma-generate", label: "Prisma client generate", command: "npx", args: ["prisma", "generate"] },
  { key: "prisma-check", label: "Prisma usage check", command: "npm", args: ["run", "check:prisma"] },
  { key: "typecheck", label: "TypeScript typecheck", command: "npm", args: ["run", "typecheck"] },
  { key: "lint", label: "Lint", command: "npm", args: ["run", "lint"] },
  { key: "unit-tests", label: "Unit tests", command: "npm", args: ["run", "test"] },
  { key: "build", label: "Build", command: "npm", args: ["run", "build"] },
];

function runStep(step) {
  console.log(`\n=== [ci:local] ${step.label} ===`);
  const result = spawnSync(step.command, step.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n[ci:local] FAILED at step: ${step.key}`);
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("[ci:local] Starting local CI guardrail checks...");
  for (const step of steps) {
    runStep(step);
  }
  console.log("\n[ci:local] All checks passed.");
}

main();
