import assert from "node:assert/strict";
import test from "node:test";

import { defineAgent } from "vite-hub/agent";
import { telegram } from "vite-hub/agent/channels";
import { createChannelWebhookRouteHandler } from "vite-hub/_internal/agent/server/internal";

// Oct 13 replays: 18:06:29 in Stockholm is 16:06:29 UTC.
const at = (hour: number, minute: number, second = 0) => Date.UTC(2026, 9, 13, hour - 2, minute, second) / 1_000;
const user = { first_name: "Max", id: 42, is_bot: false };
const bot = { first_name: "Calories", id: 7, is_bot: true };

type Prompt = Array<{ content: string | Array<{ text?: string, type: string }>, role: string }>;

function userTurns(prompt: Prompt) {
  return prompt.filter((message) => message.role === "user").map((message) => {
    const content = typeof message.content === "string" ? [{ text: message.content, type: "text" }] : message.content;
    return {
      images: content.filter((part) => part.type === "file" || part.type === "image").length,
      text: content.filter((part) => part.type === "text").map((part) => part.text).join("\n"),
    };
  });
}

// The in-memory Chat state outlives each handler, so every test uses its own chat and update ids.
let nextChatId = 1_000;
let nextUpdateId = 1;
let nextBotMessageId = 200_000;

function telegramHarness(messages: Record<string, unknown> = {}) {
  const prompts: Prompt[] = [];
  const sent: Array<Record<string, unknown>> = [];
  const chat = { id: nextChatId++, type: "private" };
  const model = {
    async doGenerate(options: { prompt: Prompt }) {
      prompts.push(options.prompt);
      return {
        content: [{ text: "Saved", type: "text" }],
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
    modelId: "telegram-message-context-test",
    provider: "test",
    specificationVersion: "v3",
    supportedUrls: {},
  };
  const agent = defineAgent({
    channels: {
      telegram: telegram({
        allowedUserIds: [42],
        botToken: "test-token",
        mode: "webhook",
        messages: {
          delivery: "manual",
          fallbackStreamingPlaceholderText: null,
          lockScope: "channel",
          timeZone: "Europe/Stockholm",
          triggerHistory: { maxAgeMs: 30 * 60 * 1_000, maxImages: 3, maxMessages: 20, source: "thread" },
          ...messages,
        },
        webhookSecret: "test-secret",
      }),
    },
    driver: { model: model as never },
    hooks: {
      "agent:finish"(event) {
        return event.reply(event.text ?? "");
      },
    },
    runtime: false,
  });
  const handler = createChannelWebhookRouteHandler(agent);

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/getMe")) return Response.json({ ok: true, result: { ...bot, username: "calories_test_bot" } });
    if (url.includes("/getFile")) return Response.json({ ok: true, result: { file_path: "photos/meal.jpg" } });
    if (url.includes("/file/bot")) return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
    if (url.includes("/sendChatAction")) return Response.json({ ok: true, result: true });
    if (url.includes("/sendMessage") || url.includes("/sendRichMessage")) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      sent.push(body);
      return Response.json({
        ok: true,
        result: { chat, date: at(18, 7), from: bot, message_id: nextBotMessageId++, text: body.text },
      });
    }
    throw new Error(`Unexpected Telegram test request: ${url}`);
  };

  async function send(message: Record<string, unknown>) {
    const tasks: Promise<unknown>[] = [];
    const response = await handler(new Request("https://example.test/api/_vitehub/agents/calories/webhooks/telegram", {
      body: JSON.stringify({ message: { chat, from: user, ...message }, update_id: nextUpdateId++ }),
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "test-secret" },
      method: "POST",
    }), "telegram", {
      agentName: "calories",
      runtime: "unknown",
      waitUntil(task) {
        tasks.push(Promise.resolve(task));
      },
    });
    assert.equal(response.status, 200);
    await Promise.all(tasks);
  }

  return { chat, prompts, send, sent };
}

const photo = (uniqueId: string) => [{ file_id: `file-${uniqueId}`, file_size: 3, file_unique_id: uniqueId, height: 480, width: 640 }];

test("A later photo keeps the earlier photo, its time, and its permanent ID in view", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = telegramHarness();

  await harness.send({ date: at(18, 6, 29), message_id: 109311, photo: photo("LEMON-CLEAR") });
  await harness.send({ date: at(18, 27), message_id: 109320, photo: photo("LEMON-RED") });

  const turns = userTurns(harness.prompts[1]!);
  assert.deepEqual(turns.map((turn) => turn.text), [
    "[Tue 2026-10-13 18:06:29 +02:00 · msg 109311 · photo LEMON-CLEAR]",
    "[Tue 2026-10-13 18:27:00 +02:00 · msg 109320 · photo LEMON-RED]",
  ]);
  assert.deepEqual(turns.map((turn) => turn.images), [1, 1]);
  assert.equal(harness.sent.length, 2);
  assert.deepEqual(harness.sent.map((body) => (body.reply_parameters as { message_id: number }).message_id), [109311, 109320]);
});

test("Only the newest three history photos are resent; older ones are named", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = telegramHarness();

  for (const [index, name] of ["BANANA", "NACHOS", "SANDWICH", "LEMON"].entries()) {
    await harness.send({ date: at(18, 6 + index), message_id: 109312 + index, photo: photo(name) });
  }
  await harness.send({ date: at(18, 12), message_id: 109316, text: "the banana was half" });

  const turns = userTurns(harness.prompts.at(-1)!);
  assert.deepEqual(turns.map((turn) => [turn.text, turn.images]), [
    ["[Tue 2026-10-13 18:06:00 +02:00 · msg 109312 · photo BANANA (not shown)]", 0],
    ["[Tue 2026-10-13 18:07:00 +02:00 · msg 109313 · photo NACHOS]", 1],
    ["[Tue 2026-10-13 18:08:00 +02:00 · msg 109314 · photo SANDWICH]", 1],
    ["[Tue 2026-10-13 18:09:00 +02:00 · msg 109315 · photo LEMON]", 1],
    ["[Tue 2026-10-13 18:12:00 +02:00 · msg 109316]\nthe banana was half", 0],
  ]);
});

test("A reply to the bot arrives as one readable line instead of JSON", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = telegramHarness();

  await harness.send({
    date: at(21, 6, 12),
    message_id: 109331,
    reply_to_message: {
      chat: harness.chat,
      date: at(18, 7, 40),
      from: bot,
      message_id: 109315,
      text: "Should I log the nachos, the banana, or both?",
    },
    text: "Both!",
  });

  const prompt = JSON.stringify(harness.prompts[0]);
  assert.deepEqual(userTurns(harness.prompts[0]!).at(-1)!.text.split("\n"), [
    "[Tue 2026-10-13 21:06:12 +02:00 · msg 109331]",
    "↪ replying to your msg 109315 (Tue 18:07): \"Should I log the nachos, the banana, or both?\"",
    "Both!",
  ]);
  assert.doesNotMatch(prompt, /reply_to_message|"kind"/);
});

test("Two messages sent in the same second produce one run and one reply", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const harness = telegramHarness({ concurrency: "steer", debounceMs: 100 });

  await Promise.all([
    harness.send({ date: at(21, 6, 12), message_id: 109331, text: "I had two different things" }),
    harness.send({ date: at(21, 6, 12), message_id: 109332, text: "Both!" }),
  ]);

  assert.equal(harness.prompts.length, 1);
  const texts = userTurns(harness.prompts[0]!).map((turn) => turn.text);
  assert.deepEqual(texts, [
    "[Tue 2026-10-13 21:06:12 +02:00 · msg 109331]\nI had two different things",
    "[Tue 2026-10-13 21:06:12 +02:00 · msg 109332]\nBoth!",
  ]);
  assert.equal(harness.sent.length, 1);
});
