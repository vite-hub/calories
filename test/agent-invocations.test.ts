import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { consoleSearchExcerpt } from "../server/api/_vitehub/console/search.get";
import { publicObservation, publicRecord } from "../server/utils/agent-invocations";

describe("publicObservation", () => {
  it("keeps the newest Telegram message text without persisting media or identifiers", () => {
    const observation = publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "input.hasMessages": true,
        "input.messages": [{
          id: "private-message-id",
          parts: [
            { text: "Two eggs and toast", type: "text" },
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
      id: "calories-trigger",
      parts: [{
        id: "calories-trigger-text",
        text: "Two eggs and toast\n\n[Photo attached]",
        type: "text",
      }],
      role: "user",
    }]);
    assert.equal(observation.attributes?.["input.hasMessages"], true);
    assert.equal(JSON.stringify(observation).includes("private-message-id"), false);
    assert.equal(JSON.stringify(observation).includes("private-image-data"), false);
    assert.equal(JSON.stringify(observation).includes("dinner.jpg"), false);
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

  it("keeps the outbound Telegram reply while removing channel identifiers", () => {
    const observation = publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "channel.delivery.source.id": "private-chat-id",
        "channel.effect.content": "Meal saved. 640 kcal and 42 g protein.",
        "channel.effect.kind": "reply",
      },
      name: "agent.channel.delivery.effect",
      sequence: 24,
      timestamp: "2026-08-26T10:20:24.000Z",
      type: "run",
    });

    assert.equal(observation.attributes?.["channel.effect.content"], "Meal saved. 640 kcal and 42 g protein.");
    assert.equal(observation.attributes?.["channel.effect.kind"], "reply");
    assert.equal(JSON.stringify(observation).includes("private-chat-id"), false);
  });

  it("uses the delivered reply instead of a duplicate completion message", () => {
    const record = publicRecord({
      agentName: "calories",
      createdAt: "2026-08-26T10:19:58.587Z",
      cursor: "1",
      id: "invocation-1",
      observations: [
        {
          attributes: {
            "channel.delivery.provider": "telegram",
            "channel.effect.content": "Meal saved. 640 kcal and 42 g protein.",
            "channel.effect.kind": "reply",
          },
          name: "agent.channel.delivery.effect",
          sequence: 1,
          timestamp: "2026-08-26T10:20:24.000Z",
          type: "run",
        },
        {
          attributes: { "result.hasValue": true },
          name: "agent.invocation.finish",
          sequence: 2,
          timestamp: "2026-08-26T10:20:25.290Z",
          type: "run",
        },
      ],
      status: "completed",
      traceId: "trace-1",
      updatedAt: "2026-08-26T10:20:25.290Z",
    });

    assert.equal(record.observations[0]?.attributes?.["channel.effect.content"], "Meal saved. 640 kcal and 42 g protein.");
    assert.equal(record.observations[1]?.attributes?.["result.text"], undefined);
  });

  it("provides a safe reply preview for traces recorded before reply content", () => {
    const observation = publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "channel.effect.kind": "reply",
      },
      name: "agent.channel.delivery.effect",
      sequence: 24,
      timestamp: "2026-08-26T10:20:24.000Z",
      type: "run",
    });

    assert.equal(observation.attributes?.["channel.effect.content"], "Completed the meal request and replied on Telegram.");
  });

  it("promotes workspace materialization to a safe ViteHub preparation event", () => {
    const observation = publicObservation({
      attributes: {
        "step.id": "materialize-1",
        "tool.hasInput": true,
        "tool.hasOutput": true,
        "tool.id": "materialize-1",
        "tool.input": { path: "", sources: ["repository"] },
        "tool.name": "materialize_sources",
        "tool.output": {
          bytes: 2_048,
          files: 12,
          sources: [{ source: "repository", privateToken: "secret" }],
          summary: "Materialized repository (12 files).",
        },
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.finish",
      sequence: 5,
      timestamp: "2026-08-26T10:20:00.000Z",
      type: "run",
    });

    assert.equal(observation.attributes?.["vitehub.activity.kind"], "preparation");
    assert.equal(observation.attributes?.["vitehub.activity.title"], "Materialized ViteHub workspace");
    assert.equal(observation.attributes?.["vitehub.activity.detail"], "Materialized repository (12 files).");
    assert.deepEqual(observation.attributes?.["tool.input"], {
      path: "workspace root",
      sources: ["repository"],
    });
    assert.deepEqual(observation.attributes?.["tool.output"], {
      bytes: 2_048,
      files: 12,
      sources: ["repository"],
      summary: "Materialized repository (12 files).",
    });
    assert.equal(JSON.stringify(observation).includes("secret"), false);
  });

  it("keeps useful tool shape while omitting private database contents", () => {
    const observation = publicObservation({
      attributes: {
        "tool.hasInput": true,
        "tool.hasOutput": true,
        "tool.id": "db-1",
        "tool.input": { params: ["private dinner"], query: "select * from meals" },
        "tool.name": "db_query",
        "tool.output": [{ calories: 640, meal: "private dinner" }],
      },
      name: "agent.tool.finish",
      sequence: 8,
      timestamp: "2026-08-26T10:20:01.000Z",
      type: "run",
    });

    assert.deepEqual(observation.attributes?.["tool.input"], {
      summary: "Private database request omitted.",
    });
    assert.deepEqual(observation.attributes?.["tool.output"], {
      rows: 1,
      summary: "Returned 1 private row.",
    });
    assert.equal(JSON.stringify(observation).includes("private dinner"), false);
  });

  it("restores conversation cards for legacy Telegram traces", () => {
    const start = publicObservation({
      attributes: { "channel.delivery.provider": "telegram" },
      name: "agent.invocation.start",
      sequence: 2,
      timestamp: "2026-08-26T10:19:58.587Z",
      type: "run",
    });
    const finish = publicObservation({
      attributes: { "channel.delivery.provider": "telegram" },
      name: "agent.invocation.finish",
      sequence: 25,
      timestamp: "2026-08-26T10:20:25.290Z",
      type: "run",
    });

    assert.deepEqual(start.attributes?.["input.messages"], [{
      id: "calories-trigger",
      parts: [{
        id: "calories-trigger-text",
        text: "Submitted a meal request on Telegram.",
        type: "text",
      }],
      role: "user",
    }]);
    assert.equal(finish.attributes?.["result.text"], "Completed the meal request and replied on Telegram.");
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

describe("public Console metadata", () => {
  it("labels private invocations without exposing Telegram identities or meal text", () => {
    const record = publicRecord({
      agentName: "calories",
      annotations: { privateMeal: "A private dinner" },
      createdAt: "2026-08-26T10:19:58.587Z",
      cursor: "1",
      id: "invocation-1",
      observations: [],
      origin: "telegram:private-user",
      status: "completed",
      threadId: "private-chat-id",
      traceId: "trace-1",
      updatedAt: "2026-08-26T10:20:25.290Z",
    });

    assert.equal(record.title, "Meal request");
    assert.equal(record.channelId, "telegram");
    assert.equal(record.origin, "telegram");
    assert.equal(record.threadId, undefined);
    assert.equal(JSON.stringify(record).includes("private"), false);
  });

  it("searches retained message text but not private tool payloads", () => {
    const record = publicRecord({
      agentName: "calories",
      createdAt: "2026-08-26T10:19:58.587Z",
      cursor: "1",
      id: "invocation-1",
      observations: [
        {
          attributes: {
            "channel.delivery.provider": "telegram",
            "input.messages": [{ parts: [{ text: "Two eggs and toast", type: "text" }], role: "user" }],
          },
          name: "agent.invocation.start",
          sequence: 1,
          timestamp: "2026-08-26T10:19:58.587Z",
          type: "run",
        },
        {
          attributes: { "tool.input": { query: "private dinner" }, "tool.name": "db_query" },
          name: "agent.tool.finish",
          sequence: 2,
          timestamp: "2026-08-26T10:20:00.000Z",
          type: "run",
        },
      ],
      status: "completed",
      traceId: "trace-1",
      updatedAt: "2026-08-26T10:20:25.290Z",
    });

    assert.match(consoleSearchExcerpt(record, "db_query") ?? "", /db_query/);
    assert.match(consoleSearchExcerpt(record, "two eggs") ?? "", /Two eggs/);
    assert.equal(consoleSearchExcerpt(record, "private dinner"), undefined);
  });
});
