import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { H3 } from "h3";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("vite-hub/package.json"));
const { createConsoleDevframeHandler } = await import(pathToFileURL(join(root, "dist/console/runtime/server/devframe.js")).href);
const { requestConsole, ConsoleRequestError } = await import(pathToFileURL(join(root, "dist/console/runtime/client/request.js")).href);

test("Console reads work when requests reach different Worker instances", async (t) => {
  const handlers = [createConsoleDevframeHandler(), createConsoleDevframeHandler()];
  const workers = handlers.map((handler) => new H3().use(handler));
  t.after(async () => { await Promise.all(handlers.map((handler) => handler.close())); });
  let nextWorker = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(input, "http://console.test"), init);
    return workers[nextWorker++ % workers.length]!.fetch(request);
  });

  for (let i = 0; i < 4; i++) {
    const response = await requestConsole("/api/_vitehub/console/sections", { signal: AbortSignal.timeout(3000) });
    assert.ok(Array.isArray(response.sections));
  }
  assert.ok(nextWorker >= 4);

  await assert.rejects(
    requestConsole("/api/_vitehub/console/sections", { method: "POST" }),
    (error: unknown) => error instanceof ConsoleRequestError && error.status === 405,
  );
  const controller = new AbortController();
  controller.abort(new Error("cancelled by caller"));
  await assert.rejects(requestConsole("/api/_vitehub/console/sections", { signal: controller.signal }), /cancelled by caller/);
});

test("Console HTTP rejects malformed and unknown operations", async (t) => {
  const handler = createConsoleDevframeHandler();
  const worker = new H3().use(handler);
  t.after(() => handler.close());
  for (const [body, expected] of [
    ["{", 400],
    [JSON.stringify({ method: "__proto__" }), 404],
    [JSON.stringify({ method: "vitehub:console:sections", input: [] }), 400],
    [JSON.stringify({ method: "vitehub:console:sections", input: { padding: "x".repeat(65536) } }), 413],
  ] as const) {
    const response = await worker.fetch(new Request("http://console.test/_vitehub/rpc/__call", {
      method: "POST", headers: { "content-type": "application/json" }, body,
    }));
    assert.equal(response.status, expected);
    assert.equal((await response.json()).ok, false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
