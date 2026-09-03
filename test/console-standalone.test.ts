import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const viteHubRoot = dirname(require.resolve("vite-hub/package.json"));

test("Devframe can be imported without module-scope randomness", () => {
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues() { throw new Error("module-scope randomness"); } },
    });
    await import("devframe/initiate");`,
  ], { cwd: process.cwd() });
});

test("the Console ships as an isolated standalone document over Devframe", async () => {
  const [nuxtModule, page, clientRequest, messageStyles, invocationEnhancer, brandFiles] = await Promise.all([
    readFile(join(viteHubRoot, "dist/nuxt.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/server/page.get.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/client/request.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-message-overrides.css"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-invocation-overrides.js"), "utf8"),
    readdir(join(viteHubRoot, "dist/console/runtime/public/console/brands")),
  ]);

  assert.match(nuxtModule, /server\/page\.get\.js/);
  assert.match(nuxtModule, /server\/devframe\.js/);
  assert.match(nuxtModule, /\/_vitehub\/rpc\/\*\*/);
  assert.doesNotMatch(nuxtModule, /route: "\/api\/_vitehub\/console/);
  assert.match(nuxtModule, /baseURL: "\/_vitehub\/assets"/);
  assert.match(nuxtModule, /dir: consolePublicRoot/);
  assert.doesNotMatch(nuxtModule, /pages:extend/);
  assert.doesNotMatch(nuxtModule, /@vite-hub\/ui\/nuxt/);

  assert.match(clientRequest, /connectDevframe/);
  assert.match(clientRequest, /vitehub:console:request/);
  assert.match(clientRequest, /transport: "sse"/);
  assert.doesNotMatch(clientRequest, /fetch\(/);

  const consoleAsset = page.match(/type="module" src="\/_vitehub\/assets\/(console-[^"]+\.js)"/)?.[1];
  assert.ok(consoleAsset, "missing the generated Console browser asset");
  const consoleBundle = await readFile(
    join(viteHubRoot, "dist/console/runtime/public/console", consoleAsset),
    "utf8",
  );
  assert.match(consoleBundle, /vitehub:console:request/);
  assert.match(consoleBundle, /_vitehub\/rpc/);

  assert.match(page, /\/_vitehub\/assets\/console-[^"/]+\.css/);
  assert.match(page, /\/_vitehub\/assets\/console-[^"/]+\.js/);
  assert.match(page, /\/_vitehub\/assets\/console-message-overrides\.css/);
  assert.match(page, /\/_vitehub\/assets\/console-invocation-overrides\.js/);
  assert.doesNotMatch(page, /\/_nuxt\//);

  assert.match(messageStyles, /\.vh-channel__logo/);
  assert.match(messageStyles, /\.vh-copy-link/);
  assert.match(messageStyles, /\.vh-console-toast/);
  assert.match(messageStyles, /\.vh-invocation-delivery__body/);
  assert.match(messageStyles, /button\[disabled\]\[aria-haspopup="menu"\]/);
  assert.match(messageStyles, /button:has\(> \[data-slot="trailing"\] kbd\)/);
  assert.match(messageStyles, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(messageStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(messageStyles, /\.vh-invocation-execution/);
  assert.match(messageStyles, /\.vh-invocation-tool-list/);
  assert.match(messageStyles, /\.vh-invocation-tool-calls/);
  assert.match(messageStyles, /\.vh-invocation-identifiers/);
  assert.match(messageStyles, /\.vh-invocation-brand__logo\.vh-sidebar-model__logo/);
  assert.match(messageStyles, /\.vh-invocation-brand__glyph/);
  assert.match(messageStyles, /\.vh-vitehub-effect__details/);
  assert.match(messageStyles, /grid-template-columns: 4\.8rem minmax\(0, 1fr\)/);
  assert.match(messageStyles, /object-fit: contain/);

  assert.match(invocationEnhancer, /OpenRouter/);
  assert.match(invocationEnhancer, /Z\.AI/);
  assert.match(invocationEnhancer, /usageCounts/);
  assert.match(invocationEnhancer, /toolCalls/);
  assert.match(invocationEnhancer, /jumpToCall/);
  assert.match(invocationEnhancer, /tool\.name/);
  assert.match(invocationEnhancer, /tool\.id/);
  assert.match(invocationEnhancer, /Put or delete Blob objects/);
  assert.match(invocationEnhancer, /enhanceThread/);
  assert.match(invocationEnhancer, /anchor\.after\(delivery\)/);
  assert.match(invocationEnhancer, /channelMeta\("Assistant"\)/);
  assert.match(invocationEnhancer, /Capabilities & tools/);
  assert.match(invocationEnhancer, /invocation-inspector__notice\"\)\?\.remove/);
  assert.match(invocationEnhancer, /Copy session link/);
  assert.match(invocationEnhancer, /linkIcon/);
  assert.match(invocationEnhancer, /Total time/);
  assert.match(invocationEnhancer, /vh-sidebar-model/);
  assert.match(invocationEnhancer, /refresh\.hidden = completed/);
  assert.match(invocationEnhancer, /session-inspector__instruction-fallback/);
  assert.match(invocationEnhancer, /OpenAI/);
  assert.match(invocationEnhancer, /Anthropic/);
  assert.match(invocationEnhancer, /Google/);
  assert.match(invocationEnhancer, /DeepSeek/);
  assert.match(invocationEnhancer, /Amazon Bedrock/);
  assert.match(invocationEnhancer, /modelMaker/);
  assert.match(invocationEnhancer, /\/_vitehub\/assets\/brands/);
  assert.match(invocationEnhancer, /document\.createElement\("img"\)/);
  assert.match(invocationEnhancer, /effectConfiguration/);
  assert.match(invocationEnhancer, /aria-expanded/);
  assert.match(invocationEnhancer, /show details/);
  assert.doesNotMatch(invocationEnhancer, /--vh-brand-icon/);
  assert.doesNotMatch(invocationEnhancer, /Partial setup/);

  for (const brand of ["openai", "anthropic", "google", "meta", "mistral", "xai", "deepseek", "cohere", "qwen", "zai", "openrouter", "aws", "azure", "groq"]) {
    assert.ok(brandFiles.includes(`${brand}.svg`), `missing ${brand} Console logo`);
  }
});
