import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import agent from "../server/agents/calories/agent.ts";

const finish = agent.hooks["agent:finish"];
const fixtureEnv = {
  VITEHUB_APP_URL: "https://calories.example",
  VITEHUB_OPENROUTER_API_KEY: "test-key",
  VITEHUB_TELEGRAM_ALLOWED_USER_ID: "42",
  VITEHUB_TELEGRAM_BOT_TOKEN: "test-token",
};
const previousEnv = Object.fromEntries(Object.keys(fixtureEnv).map(key => [key, process.env[key]]));
before(() => Object.assign(process.env, fixtureEnv));
after(() => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function replyFor(overrides: Record<string, unknown> = {}) {
  // Hooks format the reply; database verification belongs to the Agent's instructions.
  return finish({
    invocation: {},
    reply: (text: string) => text,
    text: "  Meal recorded.  ",
    toolResults: [],
    ...overrides,
  } as unknown as Parameters<typeof finish>[0]);
}

test("the finish hook formats the reply, configured dashboard, and invocation cost", async () => {
  assert.equal(await replyFor({ invocation: { usage: { cost: { display: "$0.002" } } } }),
    "Meal recorded.\n\nDashboard: https://calories.example\n\n$0.002");
});

test("the finish hook does not depend on a particular SQL result shape", async () => {
  for (const output of [[{ id: "one" }, { id: "two" }], [], null]) {
    assert.equal(await replyFor({ toolResults: [{ toolName: "db_query", output }] }),
      "Meal recorded.\n\nDashboard: https://calories.example\n\nCost unavailable");
  }
});

test("an empty model reply does not claim that a meal was saved", async () => {
  assert.equal(await replyFor({ text: " " }),
    "No reply was returned. Check the dashboard for the result.\n\nDashboard: https://calories.example\n\nCost unavailable");
});

test("the error hook explains possible persistence and provides a diagnostic reference", async () => {
  const error = agent.hooks["agent:error"];
  const output = await error({
    error: new Error("test failure"),
    invocation: { traceId: "test-trace" },
    reply: (text: string) => text,
  } as unknown as Parameters<typeof error>[0]);
  assert.match(output, /may have saved the meal before the failure/);
  assert.match(output, /Dashboard: https:\/\/calories.example/);
  assert.match(output, /Reference: test-trace/);
});
