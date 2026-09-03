import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { createMemoryAgentInvocationStore, defineAgentInvocations } from "vite-hub/agent/server";
import {
  getConsoleInvocations,
  installConsoleAgentDefinitions,
} from "vite-hub/console/server";

test("the Console uses the invocation journal configured on the discovered agent", () => {
  const configured = defineAgentInvocations({ store: createMemoryAgentInvocationStore() });

  installConsoleAgentDefinitions([{
    definition: { default: { invocations: configured } },
    fallbackName: "calories",
  }], { projectRoot: process.cwd() });

  assert.equal(getConsoleInvocations(), configured);
});

test("the generated Console plugin defers its local invocation journal fallback", async () => {
  const plugin = await readFile(".vitehub/nitro/console/plugin.mjs", "utf8");

  assert.match(plugin, /installConsoleAgentDefinitions\([^\n]+, \{ projectRoot:/);
  assert.doesNotMatch(plugin, /const vitehubConsoleInvocations = installConsoleInvocations\(/);
});

test("a configured journal installs before the local fallback establishes a Console root", () => {
  const configured = defineAgentInvocations({ store: createMemoryAgentInvocationStore() });
  const rootKey = Symbol.for("vitehub.console.invocations.root");
  const previousRoot = Reflect.get(globalThis, rootKey);
  Reflect.deleteProperty(globalThis, rootKey);

  try {
    installConsoleAgentDefinitions([{
      definition: { default: { invocations: configured } },
      fallbackName: "configured-calories",
    }], { projectRoot: "/configured-calories" });

    assert.equal(getConsoleInvocations(), configured);
  } finally {
    if (previousRoot === undefined) Reflect.deleteProperty(globalThis, rootKey);
    else Reflect.set(globalThis, rootKey, previousRoot);
  }
});
