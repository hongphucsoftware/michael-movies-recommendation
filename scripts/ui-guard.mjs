// UI LOCK GUARD
// Purpose: prevent accidental/automated rewrites of the A/B home layout.
// - Run with `node scripts/ui-guard.mjs --freeze` once to capture a baseline.
// - On each dev/start, it checks critical files against that baseline.
// - If mismatch, it restores the baseline and logs a warning.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import { dirname, join } from "path";
import process from "process";

const ROOT = process.cwd();
const BASE = join(ROOT, "ui-baseline");
const MANIFEST = join(BASE, "manifest.json");

// files we protect
const FILES = [
  "client/src/App.tsx",
  "client/src/components/PosterPair.tsx",
  "client/src/components/TrailerReel.tsx",
  "client/src/hooks/useQuickPicks.ts",
];

function sha(s) {
  return createHash("sha256").update(s).digest("hex");
}

function freeze() {
  if (!existsSync(BASE)) mkdirSync(BASE, { recursive: true });
  const manifest = {};
  for (const rel of FILES) {
    const abs = join(ROOT, rel);
    const data = readFileSync(abs, "utf8");
    const h = sha(data);
    const out = join(BASE, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, data, "utf8");
    manifest[rel] = { hash: h };
    console.log(`[ui-guard] baseline captured: ${rel}`);
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[ui-guard] baseline manifest saved.`);
}

function enforce() {
  if (!existsSync(MANIFEST)) {
    console.warn("[ui-guard] No baseline found. Run: node scripts/ui-guard.mjs --freeze");
    return;
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  for (const rel of FILES) {
    const abs = join(ROOT, rel);
    try {
      const data = readFileSync(abs, "utf8");
      const curr = sha(data);
      const expect = manifest[rel]?.hash;
      if (!expect) continue;
      if (curr !== expect) {
        console.warn(`[ui-guard] CHANGE DETECTED in ${rel}. Restoring baseline.`);
        const baseline = readFileSync(join(BASE, rel), "utf8");
        writeFileSync(abs, baseline, "utf8");
      }
    } catch (e) {
      // if file missing, restore
      console.warn(`[ui-guard] Missing ${rel}. Restoring baseline.`);
      const baseline = readFileSync(join(BASE, rel), "utf8");
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, baseline, "utf8");
    }
  }
  console.log("[ui-guard] enforcement complete.");
}

if (process.argv.includes("--freeze")) freeze();
else enforce();