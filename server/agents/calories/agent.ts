import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { defineAgent } from "vite-hub/agent";
import {
  audioBytes,
  blob,
  db as databaseCapability,
  transcribe,
  usage,
} from "vite-hub/agent/capabilities";
import { telegram } from "vite-hub/agent/channels";
import { useDatabase } from "vite-hub/database/drizzle";
import { useServerEnv } from "#vitehub/env/server";
import { z } from "zod";

export default defineAgent({
  capabilities: [
    blob({ mode: "write" }),
    databaseCapability({ mode: "write" }),
    transcribe({
      async execute({ audio }) {
        const { text } = await generateText({
          model: createOpenRouter({ apiKey: useServerEnv().openrouter.apiKey })(
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
      webhookSecret: () => useServerEnv().telegram.webhookSecret || false,
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
    model: () => createOpenRouter({ apiKey: useServerEnv().openrouter.apiKey })(
      "z-ai/glm-5.3-flashx",
    ),
  },
  hooks: {
    "agent:error"(event) {
      console.error("[calories] Agent invocation failed", event.error);
      const reference = event.invocation.traceId ?? event.invocation.run?.runId;

      return event.reply([
        "Sorry, I couldn't finish that reply. I may have saved the meal before the failure, so check the dashboard before retrying.",
        "Dashboard: https://calories.onmax.me/",
        ...(reference ? [`Reference: ${reference}`] : []),
      ].join("\n"));
    },
    async "agent:finish"(event) {
      const usageCost = event.invocation.usage?.cost?.display ?? "Cost unavailable";
      const verification = z.array(z.object({ id: z.string().trim().min(1) })).length(1).safeParse(
        event.toolResults.findLast((result) => (result.toolName ?? result.name) === "db_query")?.output,
      );
      const mealId = verification.success ? verification.data[0]?.id : undefined;
      const dashboardUrl = event.runtime?.request
        ? new URL("/", event.runtime.request.url)
        : undefined;
      if (dashboardUrl && mealId) {
        dashboardUrl.searchParams.set("meal", mealId);
      }
      if (mealId && usageCost !== "Cost unavailable") {
        try {
          const { db, schema } = useDatabase("default");
          await db
            .update(schema.meals)
            .set({ usageCost })
            .where(eq(schema.meals.id, mealId));
        } catch (error) {
          console.error("[calories] Failed to record usage cost", error);
        }
      }
      return event.reply([
        event.text?.trim() || "Done.",
        "Dashboard: " + (dashboardUrl?.toString() ?? "https://calories.onmax.me/"),
        usageCost,
      ].join("\n\n"));
    },
  },
});
