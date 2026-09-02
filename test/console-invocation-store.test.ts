import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { createMemoryAgentInvocationStore, defineAgentInvocations } from "vite-hub/agent/server";
import {
  getConsoleInvocations,
  installConsoleAgentDefinitions,
  installConsoleInvocations,
} from "vite-hub/console/server";

test("the Console uses the invocation journal configured on the discovered agent", () => {
  const fallback = installConsoleInvocations(process.cwd());
  const configured = defineAgentInvocations({ store: createMemoryAgentInvocationStore() });

  installConsoleAgentDefinitions([{
    definition: { default: { invocations: configured } },
    fallbackName: "calories",
  }], fallback);

  assert.equal(getConsoleInvocations(), configured);
});

test("the generated Console plugin defers its local invocation journal fallback", async () => {
  const plugin = await readFile(".vitehub/nitro/console/plugin.mjs", "utf8");

  assert.match(plugin, /installConsoleAgentDefinitions\([^\n]+, \(\) => installConsoleInvocations\(/);
  assert.doesNotMatch(plugin, /const vitehubConsoleInvocations = installConsoleInvocations\(/);
});
