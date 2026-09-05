import assert from "node:assert/strict";
import test from "node:test";

import { defineAgent } from "vite-hub/agent";
import { telegram } from "vite-hub/agent/channels";
import { createChannelWebhookRouteHandler } from "vite-hub/_internal/agent/server/internal";

let webhookRun = 0;

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

async function runTelegramPhotoReply() {
  const runOffset = webhookRun++ * 10;
  const originalFetch = globalThis.fetch;
  const model = capturingModel();
  const backgroundTasks: Promise<unknown>[] = [];
  let downloadedPhoto = false;

  globalThis.fetch = async (input) => {
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
    throw new Error(`Unexpected Telegram test request: ${url}`);
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
    const handler = createChannelWebhookRouteHandler(agent);
    const response = await handler(new Request(
      "https://example.test/api/_vitehub/agents/calories/webhooks/telegram",
      {
        body: JSON.stringify({
          message: {
            chat: { id: 42, type: "private" },
            date: 1_788_358_000,
            from: { first_name: "Max", id: 42, is_bot: false },
            message_id: 101 + runOffset,
            reply_to_message: {
              chat: { id: 42, type: "private" },
              date: 1_788_357_600,
              from: { first_name: "Max", id: 42, is_bot: false },
              message_id: 100 + runOffset,
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
          update_id: 123 + runOffset,
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
    return {
      downloadedPhoto,
      prompt: JSON.stringify(model.calls[0]?.prompt),
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Telegram photo replies include available content without a channel opt-in", async () => {
  const result = await runTelegramPhotoReply();

  assert.equal(result.downloadedPhoto, true);
  assert.match(result.prompt, /"data":\[1,2,3\]/);
  assert.doesNotMatch(result.prompt, /telegram-photo-id/);
});
