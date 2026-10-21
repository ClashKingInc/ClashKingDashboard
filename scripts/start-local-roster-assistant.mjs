import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { prepareAssistantConfig } from "./prepare-assistant-wrangler-config.mjs";

const port = Number(process.env.CLASHKING_ASSISTANT_PORT ?? 8789);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local assistant port");
const inspectorPort = Number(process.env.CLASHKING_ASSISTANT_INSPECTOR_PORT ?? 9230);
if (!Number.isInteger(inspectorPort) || inspectorPort < 1024 || inspectorPort > 65535) throw new Error("Invalid local assistant inspector port");
const configPath = path.resolve(".wrangler/wrangler.assistant.generated.jsonc");
const config = prepareAssistantConfig(await readFile("wrangler.assistant.jsonc", "utf8"), {
  local: true, apiOrigin: process.env.CLASHKING_API_ORIGIN,
});
await mkdir(path.dirname(configPath), { recursive: true });
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--local", "--config", configPath,
  "--port", String(port), "--inspector-port", String(inspectorPort), "--ip", "127.0.0.1", "--env-file", process.env.CLASHKING_ASSISTANT_ENV_FILE ?? ".dev.vars"], {
  stdio: "inherit", env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
child.once("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.once("exit", (code) => process.exit(code ?? 1));
