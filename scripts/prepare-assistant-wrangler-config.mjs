import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const placeholder = "__CLOUDFLARE_SECRETS_STORE_ID__";
const storeID = process.env.CLOUDFLARE_SECRETS_STORE_ID?.trim();

if (!storeID) {
  throw new Error("CLOUDFLARE_SECRETS_STORE_ID is required to prepare the AI Worker configuration");
}
if (!/^[A-Za-z0-9_-]+$/.test(storeID)) {
  throw new Error("CLOUDFLARE_SECRETS_STORE_ID contains unsupported characters");
}

const sourcePath = path.resolve("wrangler.assistant.jsonc");
const outputPath = path.resolve(".wrangler/wrangler.assistant.generated.jsonc");
const source = await readFile(sourcePath, "utf8");
if (!source.includes(placeholder)) {
  throw new Error(`Missing ${placeholder} in ${sourcePath}`);
}

const config = JSON.parse(source.replaceAll(placeholder, storeID));
config.$schema = "../node_modules/wrangler/config-schema.json";
config.main = "../workers/roster-assistant/index.ts";
const rendered = `${JSON.stringify(config, null, 2)}\n`;
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, rendered, { mode: 0o600 });
console.log(`Prepared ${path.relative(process.cwd(), outputPath)}`);
