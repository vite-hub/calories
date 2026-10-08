import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { defineAgent } from "vite-hub/agent";
import {
  audioBytes,
  blob,
  db as databaseCapability,
  transcribe,
  usage,
} from "vite-hub/agent/capabilities";
import { telegram } from "vite-hub/agent/channels";
import { useServerEnv } from "#vitehub/env/server";

export default defineAgent({
  capabilities: [
    blob({ mode: "write" }),
    databaseCapability({ mode: "write" }),
    transcribe({
      async execute({ audio }) {
        const { text } = await generateText({
          model: createOpenRouter({ apiKey: useServerEnv().openrouter.apiKey.unseal() })(
            "mistralai/voxtral-small-24b-2507",
          ),
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio exactly. Return only the transcript." },
              { type: "file", data: await audioBytes(audio), mediaType: audio.mediaType },
            ],
          }],
        });
        return text;
      },
    }),
    usage(),
  ],
  channels: {
    telegram: telegram({
      allowedUserIds: () => [useServerEnv().telegram.allowedUserId],
      botToken: () => useServerEnv().telegram.botToken,
      webhookSecret: () => useServerEnv().telegram.webhookSecret,
      messages: {
        concurrency: "steer",
        delivery: "manual",
        fallbackStreamingPlaceholderText: null,
        lockScope: "channel",
        triggerHistory: {
          maxAgeMs: 30 * 60 * 1_000,
          maxMessages: 20,
          source: "thread",
        },
        timeout: 28_000,
      },
    }),
  },
  driver: {
    maxRetries: 0,
    model: () => createOpenRouter({ apiKey: useServerEnv().openrouter.apiKey.unseal() })(
      "z-ai/glm-5.3-flashx",
    ),
  },
  hooks: {
    "agent:error"(event) {
      console.error("[calories] Agent invocation failed", event.error);
      const reference = event.invocation.traceId ?? event.invocation.run?.runId;

      return event.reply([
        "Sorry, I couldn't finish that reply. I may have saved the meal before the failure, so check the dashboard before retrying.",
        "Dashboard: " + useServerEnv().app.url,
        ...(reference ? [`Reference: ${reference}`] : []),
      ].join("\n"));
    },
    "agent:finish"(event) {
      const cost = event.invocation.usage?.cost?.display ?? "Cost unavailable";
      return event.reply([
        event.text?.trim() || "No reply was returned. Check the dashboard for the result.",
        "Dashboard: " + useServerEnv().app.url,
        cost,
      ].join("\n\n"));
    },
  },
});
