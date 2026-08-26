import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicObservation } from "../server/utils/agent-invocations";

describe("publicObservation", () => {
  it("renders a private Telegram trigger without persisting its contents", () => {
    const observation = publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "input.hasMessages": true,
        "input.messages": [{
          id: "private-message-id",
          parts: [
            { text: "A private description of dinner", type: "text" },
            {
              data: "data:image/jpeg;base64,private-image-data",
              filename: "dinner.jpg",
              mediaType: "image/jpeg",
              type: "file",
            },
          ],
          role: "user",
        }],
      },
      name: "agent.invocation.start",
      sequence: 2,
      timestamp: "2026-08-26T10:19:58.587Z",
      type: "run",
    });

    assert.deepEqual(observation.attributes?.["input.messages"], [{
      id: "calories-private-trigger",
      parts: [{
        id: "calories-private-trigger-text",
        text: "Submitted a meal request on Telegram.",
        type: "text",
      }],
      role: "user",
    }]);
    assert.equal(observation.attributes?.["input.hasMessages"], true);
    assert.equal(JSON.stringify(observation).includes("private description"), false);
    assert.equal(JSON.stringify(observation).includes("private-image-data"), false);
  });

  it("renders a safe completion message instead of the private result", () => {
    const observation = publicObservation({
      attributes: {
        "invocation.durationMs": 31_237,
        "result.hasValue": true,
        "result.text": "Private meal details and nutrition totals",
      },
      name: "agent.invocation.finish",
      sequence: 25,
      timestamp: "2026-08-26T10:20:25.290Z",
      type: "run",
    });

    assert.equal(observation.attributes?.["result.text"], "Completed the meal request and replied on Telegram.");
    assert.equal(observation.attributes?.["invocation.durationMs"], 31_237);
    assert.equal(JSON.stringify(observation).includes("Private meal details"), false);
  });

  it("keeps a safe Agent configuration for the Console inspector", () => {
    const observation = publicObservation({
      attributes: {
        "vitehub.agent.configuration": {
          agent: { name: "calories", version: "1" },
          capabilities: [
            { id: "blob", metadata: { bucket: "private-bucket" } },
            { id: "db", metadata: { database: "private-database" } },
          ],
          driver: {
            kind: "ai-sdk",
            model: { id: "glm-5v-turbo", provider: "openrouter" },
            provider: "openrouter",
          },
          instructions: ["Private system instructions"],
          runtime: { name: "cloudflare" },
          tools: [{ name: "db_query" }, { name: "blob_edit" }],
          workspace: { mode: "read", name: "Calories" },
        },
      },
      name: "vitehub.agent.configured",
      sequence: 1,
      timestamp: "2026-08-26T10:19:58.587Z",
      type: "run",
    });

    assert.deepEqual(observation.attributes?.["vitehub.agent.configuration"], {
      agent: { name: "calories", version: "1" },
      capabilities: [{ id: "blob" }, { id: "db" }],
      driver: {
        kind: "ai-sdk",
        model: { id: "glm-5v-turbo", provider: "openrouter" },
        provider: "openrouter",
      },
      runtime: { name: "cloudflare" },
      tools: [{ name: "db_query" }, { name: "blob_edit" }],
      workspace: { mode: "read", name: "Calories" },
    });
    assert.equal(JSON.stringify(observation).includes("Private system instructions"), false);
    assert.equal(JSON.stringify(observation).includes("private-bucket"), false);
  });
});
