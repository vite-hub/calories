import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const viteHubRoot = dirname(require.resolve("vite-hub/package.json"));

test("the Console ships as an isolated standalone document", async () => {
  const [nuxtModule, page, messageStyles] = await Promise.all([
    readFile(join(viteHubRoot, "dist/nuxt.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/server/page.get.js"), "utf8"),
    readFile(join(viteHubRoot, "dist/console/runtime/public/console/console-message-overrides.css"), "utf8"),
  ]);

  assert.match(nuxtModule, /server\/page\.get\.js/);
  assert.match(nuxtModule, /baseURL: "\/_vitehub\/assets"/);
  assert.match(nuxtModule, /dir: consolePublicRoot/);
  assert.doesNotMatch(nuxtModule, /pages:extend/);
  assert.doesNotMatch(nuxtModule, /@vite-hub\/ui\/nuxt/);

  assert.match(page, /\/_vitehub\/assets\/console-[^"/]+\.css/);
  assert.match(page, /\/_vitehub\/assets\/console-[^"/]+\.js/);
  assert.match(page, /\/_vitehub\/assets\/console-message-overrides\.css/);
  assert.doesNotMatch(page, /\/_nuxt\//);

  assert.match(messageStyles, /content: "You"/);
  assert.match(messageStyles, /content: "Assistant"/);
  assert.match(messageStyles, /\.vh-invocation-delivery__body/);
});
