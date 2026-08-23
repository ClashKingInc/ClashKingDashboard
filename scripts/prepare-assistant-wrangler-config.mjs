import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const placeholder = "__CLOUDFLARE_SECRETS_STORE_ID__";

function validatedStoreID(value) {
  const storeID = value?.trim();
  if (!storeID) throw new Error("CLOUDFLARE_SECRETS_STORE_ID is required to prepare the production AI Worker configuration");
  if (!/^[A-Za-z0-9_-]+$/.test(storeID)) throw new Error("CLOUDFLARE_SECRETS_STORE_ID contains unsupported characters");
  return storeID;
}

export function prepareAssistantConfig(source, options = {}) {
  if (!source.includes(placeholder)) throw new Error(`Missing ${placeholder} in the assistant Worker configuration`);

  const local = options.local === true;
  const renderedSource = local ? source.replaceAll(placeholder, "local-development") : source.replaceAll(placeholder, validatedStoreID(options.storeID));
  const config = JSON.parse(renderedSource);
  config.$schema = "../node_modules/wrangler/config-schema.json";
  config.main = "../workers/roster-assistant/index.ts";

  if (local) {
    delete config.secrets_store_secrets;
    config.vars = {
      ...config.vars,
      CLASHKING_API_ORIGIN: options.apiOrigin?.trim() || "http://127.0.0.1:8000",
    };
  }
  return config;
}

async function main() {
  const local = process.argv.includes("--local");
  const sourcePath = path.resolve("wrangler.assistant.jsonc");
  const outputPath = path.resolve(".wrangler/wrangler.assistant.generated.jsonc");
  const source = await readFile(sourcePath, "utf8");
  const config = prepareAssistantConfig(source, {
    local,
    storeID: process.env.CLOUDFLARE_SECRETS_STORE_ID,
    apiOrigin: process.env.CLASHKING_API_ORIGIN,
  });
  const rendered = `${JSON.stringify(config, null, 2)}\n`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, { mode: 0o600 });
  console.log(`Prepared ${path.relative(process.cwd(), outputPath)}${local ? " for local development" : ""}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
