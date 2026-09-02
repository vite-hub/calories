import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";

import { defineAgent } from "vite-hub/agent";
import { telegram } from "vite-hub/agent/channels";

const require = createRequire(import.meta.url);

async function createChannelWebhookRouteHandler(agent: unknown) {
  const wrapper = require.resolve("vite-hub/_internal/agent/server/internal");
  const agentRoot = dirname(require.resolve("@vite-hub/agent/package.json", {
    paths: [wrapper],
  }));
  const routeFiles = (await readdir(join(agentRoot, "dist")))
    .filter(entry => /^routes-.*\.js$/.test(entry));
  for (const filename of routeFiles) {
    const runtime = await import(join(agentRoot, "dist", filename));
    if (runtime.n?.name === "createChannelWebhookRouteHandler") {
      return runtime.n(agent);
    }
  }
  assert.fail("missing ViteHub Agent channel webhook handler");
}

function capturingModel() {
  const calls: Array<{ prompt: unknown }> = [];
  return {
    calls,
    async doGenerate(options: { prompt: unknown }) {
      calls.push(options);
      return {
        content: [{ text: "Done", type: "text" }],
        finishReason: { raw: "stop", unified: "stop" },
        usage: {
          inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
          outputTokens: { reasoning: 0, text: 1, total: 1 },
        },
        warnings: [],
      };
    },
    async doStream() {
      throw new Error("Unexpected streaming model call");
    },
    modelId: "telegram-reply-photo-test",
    provider: "test",
    specificationVersion: "v3",
    supportedUrls: {},
  };
}

test("Telegram photo replies expose the replied-to image to the model", async () => {
  const originalFetch = globalThis.fetch;
  const model = capturingModel();
  const backgroundTasks: Promise<unknown>[] = [];
  let downloadedPhoto = false;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/getMe")) {
      return Response.json({
        ok: true,
        result: { first_name: "Calories", id: 7, is_bot: true, username: "calories_test_bot" },
      });
    }
    if (url.includes("/getFile")) {
      return Response.json({ ok: true, result: { file_path: "photos/replied.jpg" } });
    }
    if (url.includes("/file/bot") && url.endsWith("/photos/replied.jpg")) {
      downloadedPhoto = true;
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      });
    }
    if (url.includes("/sendChatAction")) {
      return Response.json({ ok: true, result: true });
    }
    if (url.includes("/sendMessage") || url.includes("/editMessageText")) {
      return Response.json({
        ok: true,
        result: {
          chat: { id: 42, type: "private" },
          date: 1_788_358_000,
          from: { first_name: "Calories", id: 7, is_bot: true },
          message_id: 102,
          text: "Done",
        },
      });
    }
    return originalFetch(input, init);
  };

  try {
    const agent = defineAgent({
      channels: {
        telegram: telegram({
          allowedUserIds: [42],
          botToken: "test-token",
          mode: "webhook",
          messages: {
            delivery: "manual",
            fallbackStreamingPlaceholderText: null,
          },
          webhookSecret: "test-secret",
        }),
      },
      driver: { model: model as never },
      runtime: false,
    });
    const handler = await createChannelWebhookRouteHandler(agent);
    const response = await handler(new Request(
      "https://example.test/api/_vitehub/agents/calories/webhooks/telegram",
      {
        body: JSON.stringify({
          message: {
            chat: { id: 42, type: "private" },
            date: 1_788_358_000,
            from: { first_name: "Max", id: 42, is_bot: false },
            message_id: 101,
            reply_to_message: {
              chat: { id: 42, type: "private" },
              date: 1_788_357_600,
              from: { first_name: "Max", id: 42, is_bot: false },
              message_id: 100,
              photo: [{
                file_id: "telegram-photo-id",
                file_size: 3,
                file_unique_id: "telegram-photo-unique-id",
                height: 480,
                width: 640,
              }],
            },
            text: "today at 11.41 in denmark",
          },
          update_id: 123,
        }),
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "test-secret",
        },
        method: "POST",
      },
    ), "telegram", {
      agentName: "calories",
      runtime: "unknown",
      waitUntil(task) {
        backgroundTasks.push(Promise.resolve(task));
      },
    });

    assert.equal(response.status, 200);
    await Promise.all(backgroundTasks);
    assert.equal(model.calls.length, 1);
    assert.equal(downloadedPhoto, true);
    assert.match(JSON.stringify(model.calls[0]?.prompt), /AQID|telegram-photo-id/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
