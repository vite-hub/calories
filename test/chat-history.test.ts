import assert from "node:assert/strict";
import { test } from "node:test";

import { chat } from "vite-hub/agent/capabilities";

test("chat history keeps recent context and leaves the latest message last", async () => {
  const capability = chat({
    triggerHistory: {
      maxAgeMs: 30 * 60 * 1_000,
      maxMessages: 20,
      source: "thread",
    },
  });
  const result = await capability.triggers.message.invoke({}, {
    messages: [
      message("old request", "2026-08-29T20:00:00.000Z", "user"),
      message("recent reply", "2026-08-29T21:55:00.000Z", "assistant"),
      message("latest question", "2026-08-29T22:00:00.000Z", "user"),
    ],
  });

  assert.deepEqual(result.input.messages?.map(messageText), ["recent reply", "latest question"]);
  assert.equal(result.input.messages?.at(-1)?.role, "user");
});

function message(text: string, createdAt: string, role: "assistant" | "user") {
  return { createdAt, parts: [{ text, type: "text" }], role };
}

function messageText(message: { parts: Array<{ text?: string; type: string }> }) {
  return message.parts.find(part => part.type === "text")?.text;
}
