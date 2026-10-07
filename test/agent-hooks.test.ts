import assert from "node:assert/strict";
import test from "node:test";

import agent from "../server/agents/calories/agent.ts";

const finish = agent.hooks["agent:finish"];

async function replyFor(toolResults: Array<{ name?: string; toolName?: string; output: unknown }>) {
  // This fixture supplies the fields the hook reads and captures its reply intent.
  const event = {
    invocation: {},
    reply: (text: string) => text,
    runtime: { request: new Request("https://calories.example/api/telegram") },
    text: "Meal recorded.",
    toolResults,
  } as unknown as Parameters<typeof finish>[0];
  return finish(event);
}

test("the finish hook links to the final verified meal", async () => {
  const reply = await replyFor([
    { toolName: "db_query", output: [{ id: "older-meal" }] },
    { toolName: "db_exec", output: { changes: 1 } },
    { toolName: "db_query", output: [{ id: "verified-meal" }] },
  ]);
  assert.equal(reply, "Meal recorded.\n\nDashboard: https://calories.example/?meal=verified-meal\n\nCost unavailable");
});

test("the finish hook does not reuse a meal link after deletion", async () => {
  const reply = await replyFor([
    { toolName: "db_query", output: [{ id: "deleted-meal" }] },
    { toolName: "db_exec", output: { changes: 1 } },
    { toolName: "db_query", output: [] },
  ]);
  assert.equal(reply, "Meal recorded.\n\nDashboard: https://calories.example/\n\nCost unavailable");
});

test("the finish hook rejects ambiguous and malformed verification rows", async () => {
  for (const output of [[{ id: "one" }, { id: "two" }], [{ id: " " }], [{ id: 42 }], null]) {
    const reply = await replyFor([{ name: "db_query", output }]);
    assert.equal(reply, "Meal recorded.\n\nDashboard: https://calories.example/\n\nCost unavailable");
  }
});
