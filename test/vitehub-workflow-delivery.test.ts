import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);

async function channelDeliveryModule() {
  const wrapper = require.resolve("vite-hub/_internal/agent/server/internal");
  const agentRoot = dirname(require.resolve("@vite-hub/agent/package.json", {
    paths: [wrapper],
  }));
  const filename = (await readdir(join(agentRoot, "dist")))
    .find((entry) => /^channel-delivery-.*\.js$/.test(entry));
  assert.ok(filename, "missing ViteHub channel delivery runtime");
  return import(join(agentRoot, "dist", filename));
}

function deliveryState() {
  const values = new Map<string, unknown>();
  const lists = new Map<string, unknown[]>();
  return {
    async acquireLock(threadId: string, ttlMs: number) {
      return { expiresAt: Date.now() + ttlMs, threadId, token: "lock" };
    },
    async appendToList(key: string, value: unknown) {
      lists.set(key, [...lists.get(key) ?? [], value]);
    },
    async extendLock() {
      return true;
    },
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async getList(key: string) {
      return lists.get(key) ?? [];
    },
    async releaseLock() {},
    async set(key: string, value: unknown) {
      values.set(key, value);
    },
    async setIfNotExists(key: string, value: unknown) {
      if (values.has(key)) return false;
      values.set(key, value);
      return true;
    },
  };
}

test("Agent Workflows reconstruct delivery state before consulting request-local trackers", async () => {
  const delivery = await channelDeliveryModule();
  const requestLocal = await delivery.f(deliveryState(), {
    agentName: "calories",
    channelId: "telegram",
    id: "delivery-local",
    provider: "telegram",
    scope: "channel:calories:telegram",
    sourceId: "message-local",
  });
  const persisted = { delivery: { id: requestLocal.delivery.id }, event: async () => undefined };
  let resolutions = 0;
  delivery.b(async () => {
    resolutions += 1;
    return persisted;
  });

  try {
    const resumed = await delivery.v({}, {}, { deliveryId: requestLocal.delivery.id });
    assert.equal(resumed, persisted);
    assert.equal(resolutions, 1);
  } finally {
    delivery.u(requestLocal);
  }
});
