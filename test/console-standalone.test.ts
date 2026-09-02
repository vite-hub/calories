import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const viteHubRoot = dirname(require.resolve("vite-hub/package.json"));

test("the Console ships as an isolated standalone document", async () => {
  const [nuxtModule, page, messageStyles, invocationEnhancer] = await Promise.all([
    readFile(join(viteHubRoot, "dist/nuxt.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/server/page.get.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-message-overrides.css"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-invocation-overrides.js"), "utf8"),
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

  assert.match(messageStyles, /content: "You"/);
  assert.match(messageStyles, /content: "Assistant"/);
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
});
