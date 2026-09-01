import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { AgentInvocation, AgentInvocationInspector } from "@vite-hub/ui";

import { publicObservation, publicRecord } from "../server/utils/agent-invocations";

test("the shared Console renders the private Calories session as a conversation", async () => {
  const uiRequire = createRequire(import.meta.resolve("@vite-hub/ui"));
  const { renderToString } = await import(pathToFileURL(uiRequire.resolve("@vue/server-renderer")).href);
  const { createSSRApp, h } = await import(pathToFileURL(uiRequire.resolve("vue")).href);
  const observations = [
    publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "input.hasMessages": true,
        "input.messages": [{
          parts: [{ text: "Two eggs and toast", type: "text" }],
          role: "user",
        }],
      },
      name: "agent.invocation.start",
      sequence: 1,
      timestamp: "2026-08-26T10:00:00.000Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "materialize-1",
        "tool.hasInput": true,
        "tool.id": "materialize-1",
        "tool.input": { path: "" },
        "tool.name": "materialize_sources",
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.start",
      sequence: 2,
      timestamp: "2026-08-26T10:00:00.250Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "materialize-1",
        "tool.durationMs": 500,
        "tool.hasOutput": true,
        "tool.id": "materialize-1",
        "tool.name": "materialize_sources",
        "tool.output": { files: 12, summary: "Materialized repository (12 files)." },
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.finish",
      sequence: 3,
      timestamp: "2026-08-26T10:00:00.750Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "db-1",
        "tool.hasInput": true,
        "tool.id": "db-1",
        "tool.input": { params: ["private dinner"], query: "select * from meals" },
        "tool.name": "db_query",
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.start",
      sequence: 4,
      timestamp: "2026-08-26T10:00:01.000Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "db-1",
        "tool.durationMs": 1_000,
        "tool.hasOutput": true,
        "tool.id": "db-1",
        "tool.name": "db_query",
        "tool.output": [{ meal: "private dinner" }],
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.finish",
      sequence: 5,
      timestamp: "2026-08-26T10:00:02.000Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "channel.effect.content": "Meal saved. 640 kcal and 42 g protein.",
        "channel.effect.kind": "reply",
      },
      name: "agent.channel.delivery.effect",
      sequence: 6,
      timestamp: "2026-08-26T10:00:02.500Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "invocation.durationMs": 3_000,
        "result.hasValue": true,
      },
      name: "agent.invocation.finish",
      sequence: 7,
      timestamp: "2026-08-26T10:00:03.000Z",
      type: "run",
    }),
  ];
  const invocation = publicRecord({
    agentName: "calories",
    completedAt: "2026-08-26T10:00:03.000Z",
    createdAt: "2026-08-26T10:00:00.000Z",
    cursor: "1",
    id: "test-invocation",
    observations,
    startedAt: "2026-08-26T10:00:00.000Z",
    status: "completed" as const,
    traceId: "test-trace",
    updatedAt: "2026-08-26T10:00:03.000Z",
  });

  const html = await renderToString(createSSRApp({
    render: () => h("div", [
      h(AgentInvocation, { invocation }),
      h(AgentInvocationInspector, { invocation }),
    ]),
  }));

  assert.match(html, /Two eggs and toast/);
  assert.match(html, /Session prepared/);
  assert.match(html, /Materialized ViteHub workspace/);
  assert.match(html, /Materialized repository \(12 files\)\./);
  assert.match(html, /Worked for 3s/);
  assert.match(html, /Queried database/);
  assert.match(html, /Returned 1 private row\./);
  assert.match(html, /Trace timeline/);
  assert.match(html, />Agent</);
  assert.match(html, />ViteHub</);
  assert.match(html, /Reply sent/);
  assert.match(html, /Meal saved\. 640 kcal and 42 g protein\./);
  assert.ok(html.indexOf("Two eggs and toast") < html.indexOf("Reply sent"));
  assert.doesNotMatch(html, /Completed the meal request and replied on Telegram\./);
  assert.doesNotMatch(html, /db_query/);
  assert.doesNotMatch(html, /private dinner/);
});
