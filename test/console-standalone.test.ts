import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const viteHubRoot = dirname(require.resolve("vite-hub/package.json"));

test("the Console ships as an isolated standalone document", async () => {
  const [nuxtModule, page, messageStyles, invocationEnhancer, brandFiles] = await Promise.all([
    readFile(join(viteHubRoot, "dist/nuxt.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/server/page.get.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-message-overrides.css"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-invocation-overrides.js"), "utf8"),
    readdir(join(viteHubRoot, "dist/console/runtime/public/console/brands")),
  ]);

  assert.match(nuxtModule, /server\/page\.get\.js/);
  assert.match(nuxtModule, /baseURL: "\/_vitehub\/assets"/);
  assert.match(nuxtModule, /dir: consolePublicRoot/);
  assert.doesNotMatch(nuxtModule, /pages:extend/);
  assert.doesNotMatch(nuxtModule, /@vite-hub\/ui\/nuxt/);

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

  assert.match(invocationEnhancer, /OpenRouter/);
  assert.match(invocationEnhancer, /Z\.AI/);
  assert.match(invocationEnhancer, /usageCounts/);
  assert.match(invocationEnhancer, /tool\.name/);
  assert.match(invocationEnhancer, /tool\.id/);
  assert.match(invocationEnhancer, /Put or delete Blob objects/);
  assert.match(invocationEnhancer, /enhanceThread/);
  assert.match(invocationEnhancer, /anchor\.after\(delivery\)/);
  assert.match(invocationEnhancer, /channelMeta\("Assistant"\)/);
  assert.match(invocationEnhancer, /Capabilities & tools/);
  assert.match(invocationEnhancer, /Partial setup/);
  assert.match(invocationEnhancer, /Copy session link/);
  assert.match(invocationEnhancer, /refresh\.hidden = completed/);
  assert.match(invocationEnhancer, /session-inspector__instruction-fallback/);
  assert.match(invocationEnhancer, /OpenAI/);
  assert.match(invocationEnhancer, /Anthropic/);
  assert.match(invocationEnhancer, /Google/);
  assert.match(invocationEnhancer, /DeepSeek/);
  assert.match(invocationEnhancer, /Amazon Bedrock/);
  assert.match(invocationEnhancer, /modelMaker/);
  assert.match(invocationEnhancer, /\/_vitehub\/assets\/brands/);

  for (const brand of ["openai", "anthropic", "google", "meta", "mistral", "xai", "deepseek", "cohere", "qwen", "zai", "openrouter", "aws", "azure", "groq"]) {
    assert.ok(brandFiles.includes(`${brand}.svg`), `missing ${brand} Console logo`);
  }
});
