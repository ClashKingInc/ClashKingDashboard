import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const clientRoot = join(process.cwd(), "dist", "client");
const manifestPath = join(clientRoot, ".vite", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];

const MAX_CHUNK_GZIP_BYTES = 225 * 1024;
const MAX_PREVIEW_RAW_BYTES = 64 * 1024;

for (const entry of Object.values(manifest)) {
  if (typeof entry.file !== "string" || !entry.file.endsWith(".js")) continue;
  const path = join(clientRoot, entry.file);
  const gzipBytes = gzipSync(readFileSync(path)).byteLength;
  if (gzipBytes > MAX_CHUNK_GZIP_BYTES) {
    failures.push(`${entry.file} is ${(gzipBytes / 1024).toFixed(1)} KiB gzip (limit: ${MAX_CHUNK_GZIP_BYTES / 1024} KiB)`);
  }
}

const preview = Object.values(manifest).find((entry) => typeof entry.file === "string" && entry.file.includes("discord-embed-preview-"));
if (!preview) {
  failures.push("The Discord preview chunk was not emitted independently");
} else {
  const rawBytes = statSync(join(clientRoot, preview.file)).size;
  if (rawBytes > MAX_PREVIEW_RAW_BYTES) {
    failures.push(`${preview.file} is ${(rawBytes / 1024).toFixed(1)} KiB raw (limit: ${MAX_PREVIEW_RAW_BYTES / 1024} KiB)`);
  }
}

const requiredLazyEntries = [
  ["app/dashboard/embeds/page.tsx", "components/dashboard/embed-editor.tsx"],
  ["app/dashboard/graphics/page.tsx", "app/dashboard/graphics/graphic-editor.tsx"],
];

for (const [route, lazyModule] of requiredLazyEntries) {
  const dynamicImports = manifest[route]?.dynamicImports ?? [];
  if (!dynamicImports.includes(lazyModule)) {
    failures.push(`${lazyModule} must remain a dynamic import of ${route}`);
  }
}

if (failures.length > 0) {
  console.error("Dashboard bundle budgets failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Dashboard bundle budgets passed.");
}
