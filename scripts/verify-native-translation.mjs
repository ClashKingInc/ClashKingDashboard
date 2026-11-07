import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Exercise the real built edge Worker and its static HTML over HTTP. This does
// not mock responses, launch a browser, or make requests to production APIs.
const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "http://127.0.0.1:8854";
const child = spawn(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js", "dev", "--config",
  "dist/clashking_dashboard/wrangler.json", "--local", "--ip", "127.0.0.1",
  "--port", "8854", "--local-upstream", "localhost",
], { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
child.stdout.on("data", data => { logs += data; });
child.stderr.on("data", data => { logs += data; });

function assertProtected(html, path) {
  for (const openingTag of [/<html\b[^>]*>/i, /<body\b[^>]*>/i, /<div\b[^>]*id="root"[^>]*>/i]) {
    const tag = html.match(openingTag)?.[0];
    assert(tag, `Missing document/app element at ${path}`);
    assert.match(tag, /translate="no"/, `Missing native translation policy at ${path}`);
    assert.match(tag, /class="[^"]*\bnotranslate\b/, `Missing translator opt-out at ${path}`);
  }
}

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(logs.slice(-3000));
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000), redirect: "error" })).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert(ready, logs.slice(-3000));
  const appPaths = ["/access", "/auth/callback", "/dashboard", "/dashboard/general?guildId=123", "/login", "/servers", "/view?share=invalid", "/roster", "/transcript"];
  for (const path of appPaths) {
    const response = await fetch(origin + path, { redirect: "error" });
    assert.equal(response.status, 200, path);
    assertProtected(await response.text(), path);
  }
  for (const path of ["/", "/fr", "/features", "/privacy", "/dashboard-help"]) {
    const response = await fetch(origin + path, { redirect: "error" });
    assert.equal(response.status, 200, path);
    assert.doesNotMatch(await response.text(), /translate="no"|class="[^"]*\bnotranslate\b/, path);
  }
  const embedded = await fetch(origin + "/dashboard/general?embedded=1", { redirect: "error" });
  assert.equal(embedded.headers.get("x-frame-options"), null);
  assert.equal(embedded.headers.get("cache-control"), "no-store");
  assert.match(embedded.headers.get("content-security-policy"), /https:\/\/app\.clashk\.ing/);
  assertProtected(await embedded.text(), "embedded dashboard");
  const html = await fetch(origin + "/dashboard", { redirect: "error" }).then(response => response.text());
  const entry = html.match(/<script[^>]*src="([^"]+)"/)?.[1];
  assert(entry, "Missing real application entry");
  const script = await fetch(origin + entry, { redirect: "error" });
  assert.equal(script.status, 200);
  assert(!script.headers.get("content-type")?.includes("text/html"));
  console.log("PASS built Dashboard edge HTTP: native policy on 9 application routes and embedded HTML; public pages and JavaScript untouched; frame/security headers preserved.");
} finally {
  child.kill("SIGTERM");
}
