import assert from "node:assert/strict";
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
