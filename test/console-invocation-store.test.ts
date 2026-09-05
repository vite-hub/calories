import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineAgent } from "vite-hub/agent";
import { createMemoryAgentInvocationStore, defineAgentInvocations } from "vite-hub/agent/server";
import {
  getConsoleInvocations,
  installConsoleAgentDefinitions,
} from "vite-hub/console/server";

test("the Console uses the invocation journal configured on the discovered agent", () => {
  const configured = defineAgentInvocations({ store: createMemoryAgentInvocationStore() });

  installConsoleAgentDefinitions([{
    definition: { default: defineAgent({ driver: { run: () => "done" }, invocations: configured }) },
    fallbackName: "calories",
  }], { projectRoot: process.cwd() });

  assert.equal(getConsoleInvocations(), configured);
});

test("the generated Console plugin defers its local invocation journal fallback", async () => {
  const plugin = await readFile(".vitehub/nitro/console/plugin.mjs", "utf8");

  assert.match(plugin, /installConsoleAgentDefinitions\([^\n]+, \{ projectRoot:/);
  assert.doesNotMatch(plugin, /const vitehubConsoleInvocations = installConsoleInvocations\(/);
});

test("a configured journal does not create a local fallback database", async (context) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "calories-console-"));
  context.after(() => rm(projectRoot, { recursive: true, force: true }));
  const configured = defineAgentInvocations({ store: createMemoryAgentInvocationStore() });

  installConsoleAgentDefinitions([{
    definition: { default: defineAgent({ driver: { run: () => "done" }, invocations: configured }) },
    fallbackName: "configured-calories",
  }], { projectRoot });

  assert.equal(getConsoleInvocations(), configured);
  await assert.rejects(access(join(projectRoot, ".vitehub")), { code: "ENOENT" });
});
