#!/usr/bin/env node
/**
 * Process KeyPilot logo: make black transparent, trim and crop top/bottom.
 * Run: node scripts/process-logo.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const inputPath = path.join(publicDir, "KeyPilot-logo.png");
const outputPath = path.join(publicDir, "KeyPilot-logo.png");

async function processLogo() {
  const image = sharp(inputPath);
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Make black/near-black pixels transparent
  const threshold = 40;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < threshold && g < threshold && b < threshold) {
      data[i + 3] = 0;
    }
  }

  let processed = sharp(Buffer.from(data), {
    raw: { width, height, channels },
  });

  // Trim transparent borders only (no aggressive crop - preserve full logo)
  await processed.trim({ threshold: 15 }).png().toFile(outputPath);

  console.log("Logo processed:", outputPath);
}

processLogo().catch((err) => {
  console.error(err);
  process.exit(1);
});
