import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { drizzle } from "drizzle-orm/libsql";
import { defineAgent } from "vite-hub/agent";
import { createDatabaseAgentInvocationStore } from "vite-hub/agent/invocations/database";
import { getConsoleInvocations, installConsoleAgentDefinitions } from "vite-hub/console/server";
import { databases } from "vite-hub/database/drizzle";

import database from "../server/databases/config";

async function useTestDatabase(context: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "calories-invocations-"));
  const db = drizzle({ connection: { url: `file:${join(directory, "sqlite.db")}` } });
  const client = db.$client;
  const previous = databases.default;
  Object.assign(databases, { default: { db, schema: database.schema } });
  context.after(async () => {
    Object.assign(databases, { default: previous });
    client.close();
    await rm(directory, { force: true, recursive: true });
  });
  return { client, directory };
}

function invocation(id: string) {
  const now = new Date().toISOString();
  return {
    agentName: "calories",
    createdAt: now,
    id,
    observations: [],
    status: "pending" as const,
    traceId: `trace-${id}`,
    updatedAt: now,
  };
}

test("the database store persists invocations and exclusive claims in the default database", async (context) => {
  const { client } = await useTestDatabase(context);
  const store = createDatabaseAgentInvocationStore();

  assert.equal((await store.create(invocation("first"))).created, true);
  assert.equal((await store.create(invocation("first"))).created, false);

  assert.equal(await store.claim("first", "worker-a", 60_000), true);
  assert.equal(await store.claim("first", "worker-b", 60_000), false);

  const completed = await store.update("first", { status: "completed" }, "worker-a");
  assert.equal(completed?.status, "completed");
  assert.equal((await store.get("first"))?.status, "completed");
  assert.deepEqual((await store.list()).invocations.map((summary) => summary.id), ["first"]);

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vitehub_agent_invocations'");
  assert.equal(tables.rows.length, 1);
});

test("an Agent without a journal records invocations in the app database, not in a Console fallback", async (context) => {
  const { directory } = await useTestDatabase(context);
  const agent = defineAgent({ driver: { run: () => "done" } });

  assert.ok(agent.invocations);
  installConsoleAgentDefinitions([{
    definition: { default: agent },
    fallbackName: "database-calories",
  }], { projectRoot: directory });

  assert.equal(getConsoleInvocations(), agent.invocations);
  await assert.rejects(access(join(directory, ".vitehub")), { code: "ENOENT" });
});
