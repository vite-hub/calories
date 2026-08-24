import assert from "node:assert/strict";
import test from "node:test";

import { defineAgent, defineCapability, runAgentInline } from "vite-hub/agent";

const outputSchema = {
  "~standard": {
    jsonSchema: {
      input: () => ({
        properties: { text: { type: "string" } },
        required: ["text"],
        type: "object",
      }),
      output: () => ({ type: "object" }),
    },
    validate(value: unknown) {
      return value
        && typeof value === "object"
        && typeof (value as { text?: unknown }).text === "string"
        ? { value: value as { text: string } }
        : { issues: [{ message: "Expected text to be a string" }] };
    },
    vendor: "calories-test",
    version: 1 as const,
  },
};

type ModelContent = Array<Record<string, unknown>>;

function model(responses: Array<ModelContent | string>) {
  const calls: Array<{ prompt: unknown; responseFormat?: unknown }> = [];
  return {
    calls,
    async doGenerate(options: { prompt: unknown; responseFormat?: unknown }) {
      calls.push(options);
      const response = responses[calls.length - 1];
      if (response === undefined) throw new Error("Unexpected model call");
      return {
        content: typeof response === "string"
          ? [{ text: response, type: "text" }]
          : response,
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
    modelId: "vitehub-recovery-test",
    provider: "test",
    specificationVersion: "v3",
    supportedUrls: {},
  };
}

const runtime = {
  memo: <T>(_key: string, create: () => T) => create(),
  runtime: "unknown" as const,
  waitUntil: () => undefined,
};

test("ViteHub repairs structured output with three total attempts by default", async () => {
  const fakeModel = model([
    "{\"text\":1}",
    "{\"text\":2}",
    "{\"text\":\"repaired\"}",
  ]);
  const agent = defineAgent({
    driver: {
      model: fakeModel as never,
      output: { schema: outputSchema },
    },
    runtime: false,
  });

  const result = await runAgentInline(agent, runtime, { prompt: "Respond" });
  assert.deepEqual(result, { text: "repaired" });
  assert.equal(fakeModel.calls.length, 3);
});

test("ViteHub lets consumers disable structured-output repair", async () => {
  const fakeModel = model([
    "{\"text\":1}",
    "{\"text\":\"must not run\"}",
  ]);
  const agent = defineAgent({
    driver: {
      model: fakeModel as never,
      output: { maxAttempts: 1, schema: outputSchema },
    },
    runtime: false,
  });

  await assert.rejects(runAgentInline(agent, runtime, { prompt: "Respond" }), {
    code: "AGENT_OUTPUT_SCHEMA_INVALID",
  });
  assert.equal(fakeModel.calls.length, 1);
});

const toolInputSchema = {
  "~standard": {
    jsonSchema: {
      input: () => ({
        properties: { query: { type: "string" } },
        required: ["query"],
        type: "object",
      }),
      output: () => ({ type: "object" }),
    },
    validate(value: unknown) {
      return value
        && typeof value === "object"
        && typeof (value as { query?: unknown }).query === "string"
        ? { value: value as { query: string } }
        : { issues: [{ message: "Expected query to be a string" }] };
    },
    vendor: "calories-test",
    version: 1 as const,
  },
};

function toolCallingAgent(
  fakeModel: ReturnType<typeof model>,
  execute: (input: unknown) => string,
  repairToolCall?: boolean,
) {
  return defineAgent({
    capabilities: [defineCapability({
      id: "search-test",
      tools: {
        search: {
          execute,
          inputSchema: toolInputSchema,
          name: "search",
        },
      },
    })],
    driver: {
      execution: repairToolCall === undefined ? undefined : { repairToolCall },
      model: fakeModel as never,
    },
    runtime: false,
  });
}

test("ViteHub repairs invalid arguments for an existing tool by default", async () => {
  const executions: unknown[] = [];
  const fakeModel = model([
    [{
      input: "{\"query\":1}",
      toolCallId: "call-1",
      toolName: "search",
      type: "tool-call",
    }],
    "{\"query\":\"fixed\"}",
    "Finished",
  ]);
  const agent = toolCallingAgent(fakeModel, (input) => {
    executions.push(input);
    return "found";
  });

  const result = await runAgentInline(agent, runtime, { prompt: "Search" }) as { text: string };

  assert.equal(result.text, "Finished");
  assert.deepEqual(executions, [{ query: "fixed" }]);
  assert.equal(fakeModel.calls.length, 3);
  assert.ok(fakeModel.calls[1]?.responseFormat);
});

test("ViteHub lets consumers disable tool-call repair", async () => {
  const executions: unknown[] = [];
  const fakeModel = model([
    [{
      input: "{\"query\":1}",
      toolCallId: "call-1",
      toolName: "search",
      type: "tool-call",
    }],
    "Could not call the tool",
  ]);
  const agent = toolCallingAgent(fakeModel, (input) => {
    executions.push(input);
    return "found";
  }, false);

  const result = await runAgentInline(agent, runtime, { prompt: "Search" }) as { text: string };

  assert.equal(result.text, "Could not call the tool");
  assert.deepEqual(executions, []);
  assert.equal(fakeModel.calls.length, 2);
});

test("ViteHub does not guess unknown tool names during repair", async () => {
  const executions: unknown[] = [];
  const fakeModel = model([
    [{
      input: "{\"query\":\"users\"}",
      toolCallId: "call-1",
      toolName: "unknown_search",
      type: "tool-call",
    }],
    "Unknown tool",
  ]);
  const agent = toolCallingAgent(fakeModel, (input) => {
    executions.push(input);
    return "found";
  });

  const result = await runAgentInline(agent, runtime, { prompt: "Search" }) as { text: string };

  assert.equal(result.text, "Unknown tool");
  assert.deepEqual(executions, []);
  assert.equal(fakeModel.calls.length, 2);
  assert.equal(fakeModel.calls.some(call => call.responseFormat), false);
});
