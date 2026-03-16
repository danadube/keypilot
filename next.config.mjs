import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

let commitHash = "";
try {
  commitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
} catch {
  // Not in a git repo or git unavailable; leave empty
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: commitHash,
  },
};

export default nextConfig;
