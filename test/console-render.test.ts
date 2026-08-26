import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { AgentInvocation } from "@vite-hub/ui";

import { publicObservation } from "../server/utils/agent-invocations";

test("the shared Console renders the private Calories session as a conversation", async () => {
  const uiRequire = createRequire(import.meta.resolve("@vite-hub/ui"));
  const { renderToString } = await import(pathToFileURL(uiRequire.resolve("@vue/server-renderer")).href);
  const { createSSRApp, h } = await import(pathToFileURL(uiRequire.resolve("vue")).href);
  const observations = [
    publicObservation({
      attributes: {
        "channel.delivery.provider": "telegram",
        "input.hasMessages": true,
      },
      name: "agent.invocation.start",
      sequence: 1,
      timestamp: "2026-08-26T10:00:00.000Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "db-1",
        "tool.id": "db-1",
        "tool.name": "db_query",
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.start",
      sequence: 2,
      timestamp: "2026-08-26T10:00:01.000Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "step.id": "db-1",
        "tool.id": "db-1",
        "tool.name": "db_query",
        "vitehub.activity.kind": "tool",
      },
      name: "agent.tool.finish",
      sequence: 3,
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
      sequence: 4,
      timestamp: "2026-08-26T10:00:02.500Z",
      type: "run",
    }),
    publicObservation({
      attributes: {
        "invocation.durationMs": 3_000,
        "result.hasValue": true,
      },
      name: "agent.invocation.finish",
      sequence: 5,
      timestamp: "2026-08-26T10:00:03.000Z",
      type: "run",
    }),
  ];
  const invocation = {
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
  };

  const html = await renderToString(createSSRApp({
    render: () => h(AgentInvocation, { invocation }),
  }));

  assert.match(html, /Submitted a meal request on Telegram\./);
  assert.match(html, /Worked for 3s/);
  assert.match(html, /Queried database/);
  assert.match(html, /Completed the meal request and replied on Telegram\./);
  assert.match(html, /Reply sent/);
  assert.match(html, /Meal saved\. 640 kcal and 42 g protein\./);
  assert.ok(html.indexOf("Completed the meal request") < html.indexOf("Reply sent"));
  assert.doesNotMatch(html, /db_query/);
});
