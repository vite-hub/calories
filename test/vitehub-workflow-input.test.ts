import assert from "node:assert/strict";
import test from "node:test";

import { portableAgentWorkflowInput, runAgent, workflow } from "vite-hub/agent";
import { createRuntimeContext } from "vite-hub/runtime";
import {
  createMemoryAgentInvocationStore,
  defineAgentInvocations,
} from "vite-hub/agent/server";
import { setAgentWorkflowRuntimeLoaders } from "vite-hub/_internal/agent/server/internal";

test("Agent Workflows materialize direct photos and preserve serializable reply metadata", async () => {
  let dataLoads = 0;
  let metadataLoads = 0;
  const input = await portableAgentWorkflowInput({
    context: {},
    messages: [{
      parts: [
        {
          data: {
            attachment: {
              mediaType: "image/jpeg",
              type: "image",
            },
          },
          type: "data-chat-reply-attachment",
        },
        {
          fetchData: async () => {
            dataLoads += 1;
            return new Uint8Array([1, 2, 3]);
          },
          fetchMetadata: async () => {
            metadataLoads += 1;
            return { height: 480, width: 640 };
          },
          mediaType: "image/jpeg",
          type: "image",
        },
      ],
      role: "user",
    }],
  });

  assert.equal(dataLoads, 1);
  assert.equal(metadataLoads, 0);
  assert.deepEqual(input.messages?.[0]?.parts[0], {
    data: {
      attachment: {
        mediaType: "image/jpeg",
        type: "image",
      },
    },
    type: "data-chat-reply-attachment",
  });
  assert.deepEqual(input.messages?.[0]?.parts[1], {
    data: "data:image/jpeg;base64,AQID",
    mediaType: "image/jpeg",
    type: "image",
  });
});

test("Agent Workflows normalize cross-runtime channel delivery locks", async () => {
  const lock = Object.assign(Object.create({ runtime: "cloudflare-rpc" }), {
    expiresAt: 1_788_357_555_771,
    threadId: "channel:calories:telegram",
    token: "lock-token",
  });

  const input = await portableAgentWorkflowInput({
    context: {
      "vitehub.channelDelivery": {
        channelId: "telegram",
        deliveryId: "delivery-id",
        provider: "telegram",
        state: "chat",
        steer: {
          claimId: "claim-id",
          lock,
          pendingQueue: "pending-queue",
          queue: "queue",
          ttlMs: 300_000,
        },
      },
    },
  });

  assert.deepEqual(input.context?.["vitehub.channelDelivery"], {
    channelId: "telegram",
    deliveryId: "delivery-id",
    provider: "telegram",
    state: "chat",
    steer: {
      claimId: "claim-id",
      lock: {
        expiresAt: 1_788_357_555_771,
        threadId: "channel:calories:telegram",
        token: "lock-token",
      },
      pendingQueue: "pending-queue",
      queue: "queue",
      ttlMs: 300_000,
    },
  });
});

test("Agent Workflows journal failures that occur before the provider run starts", async () => {
  setAgentWorkflowRuntimeLoaders({
    state: async () => ({
      getInlineWorkflowDefinitions: () => new Map(),
      getWorkflowRuntimeConfig: () => undefined,
      getWorkflowRuntimeRegistry: () => undefined,
      loadWorkflowDefinition: async () => undefined,
      registerInlineWorkflowDefinition: () => undefined,
      setWorkflowRuntimeConfig: () => undefined,
    } as never),
    workflow: async () => ({
      createWorkflow: () => ({
        name: "preflight-photo-test",
        run: async () => assert.fail("workflow must not start with a nonportable input"),
      }),
    } as never),
  });

  const store = createMemoryAgentInvocationStore();
  const agent = {
    invocations: defineAgentInvocations({ store }),
    name: "calories",
    resolve: async () => assert.fail("provider must not resolve before workflow input validation"),
    runtime: workflow("preflight-photo-test"),
  };
  const error = new TypeError("Agent Workflow inputs must contain only JSON-compatible values.");

  await assert.rejects(runAgent(agent as never, createRuntimeContext({
    run: { runId: "telegram:photo-preflight" },
    runtime: "unknown",
  }), {
    context: { nonportable: () => error },
  }), error);

  const page = await store.list({ limit: 1 });
  assert.equal(page.invocations.length, 1);
  const record = page.invocations[0];
  assert.equal(record?.agentName, "calories");
  assert.equal(record?.status, "failed");
  assert.deepEqual(record?.error, {
    message: error.message,
    name: "TypeError",
  });
  assert.match(record?.id ?? "", /^sha256_/);
  assert.match(record?.traceId ?? "", /^sha256_/);
});
