import { and, desc, eq, inArray, isNull, lt, lte, or } from "drizzle-orm";
import {
  applyAgentInvocationStoreUpdate,
  defineAgentInvocations,
  type AgentInvocationListOptions,
  type AgentInvocationRecord,
  type AgentInvocationStore,
  type AgentInvocationStoreCreateInput,
  type AgentInvocationStoreUpdateInput,
} from "vite-hub/agent/server";
import { useDatabase } from "vite-hub/database/drizzle";
import type { TraceEventLogEntry } from "vite-hub/runtime";

const publicAttributeKeys = new Set([
  "approval.id",
  "channel.delivery.provider",
  "channel.effect.intent",
  "channel.effect.kind",
  "model.call.id",
  "runtime.name",
  "step.id",
  "tool.id",
  "tool.name",
  "tool.title",
  "usage.reasoningOutputTokens",
  "usage.reasoningTokens",
  "usage.totalTokens",
  "vitehub.action.name",
  "vitehub.activity.kind",
]);

function publicObservation(entry: TraceEventLogEntry): TraceEventLogEntry {
  const attributes: Record<string, boolean | number | string | null> = {};
  for (const [key, value] of Object.entries(entry.attributes ?? {})) {
    if (!publicAttributeKeys.has(key)) continue;
    if (typeof value === "string") attributes[key] = value.slice(0, 256);
    else if (typeof value === "number" && Number.isFinite(value)) attributes[key] = value;
    else if (typeof value === "boolean" || value === null) attributes[key] = value;
  }

  return {
    ...entry,
    ...(Object.keys(attributes).length ? { attributes } : { attributes: undefined }),
  };
}

function publicRecord(record: AgentInvocationRecord): AgentInvocationRecord {
  return {
    agentName: record.agentName,
    ...(record.cancelledAt ? { cancelledAt: record.cancelledAt } : {}),
    ...(record.completedAt ? { completedAt: record.completedAt } : {}),
    createdAt: record.createdAt,
    cursor: record.cursor,
    ...(record.error ? { error: { message: "Agent invocation failed." } } : {}),
    ...(record.failedAt ? { failedAt: record.failedAt } : {}),
    id: record.id,
    observations: record.observations.map(publicObservation),
    ...(record.startedAt ? { startedAt: record.startedAt } : {}),
    status: record.status,
    traceId: record.traceId,
    updatedAt: record.updatedAt,
  };
}

function asRecord(value: unknown, cursor: number): AgentInvocationRecord | undefined {
  if (!value || typeof value !== "object") return;
  const record = value as Partial<AgentInvocationRecord>;
  if (typeof record.id !== "string" || !Array.isArray(record.observations)) return;
  return { ...record, cursor: String(cursor) } as AgentInvocationRecord;
}

function createD1AgentInvocationStore(): AgentInvocationStore {
  const database = () => {
    const { db, schema } = useDatabase("default");
    return { db, table: schema.agentInvocations };
  };

  const get = async (id: string): Promise<AgentInvocationRecord | undefined> => {
    const { db, table } = database();
    const [row] = await db.select({ record: table.record, sequence: table.sequence })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    return row ? asRecord(row.record, row.sequence) : undefined;
  };

  return {
    async claim(id, claimId, leaseMs, force) {
      const { db, table } = database();
      const now = Date.now();
      const rows = await db.update(table)
        .set({ claimExpiresAt: now + leaseMs, claimId })
        .where(and(
          eq(table.id, id),
          force
            ? undefined
            : or(isNull(table.claimId), eq(table.claimId, claimId), lte(table.claimExpiresAt, now)),
        ))
        .returning({ id: table.id });
      return rows.length > 0;
    },

    async create(input: AgentInvocationStoreCreateInput) {
      const { db, table } = database();
      const record = publicRecord({ ...input, cursor: "0" });
      const rows = await db.insert(table)
        .values({
          id: record.id,
          record: record as unknown as Record<string, unknown>,
          status: record.status,
          updatedAt: new Date(record.updatedAt),
        })
        .onConflictDoNothing({ target: table.id })
        .returning({ record: table.record, sequence: table.sequence });
      const created = rows[0] && asRecord(rows[0].record, rows[0].sequence);
      if (created) return { created: true, record: created };

      const existing = await get(record.id);
      if (!existing) throw new Error("Failed to create Agent invocation record.");
      return { created: false, record: existing };
    },

    get,

    async list(options: AgentInvocationListOptions = {}) {
      const { db, table } = database();
      const limit = options.limit ?? 50;
      const cursor = options.cursor === undefined ? undefined : Number(options.cursor);
      if (cursor !== undefined && (!Number.isSafeInteger(cursor) || cursor < 1)) {
        throw new TypeError("Agent invocation cursor is invalid.");
      }
      const statuses = options.status === undefined
        ? undefined
        : Array.isArray(options.status) ? [...options.status] : [options.status];
      if (statuses?.length === 0) return { invocations: [] };

      const rows = await db.select({ record: table.record, sequence: table.sequence })
        .from(table)
        .where(and(
          cursor === undefined ? undefined : lt(table.sequence, cursor),
          statuses ? inArray(table.status, statuses) : undefined,
        ))
        .orderBy(desc(table.sequence))
        .limit(limit + 1);
      const page = rows.slice(0, limit);
      return {
        ...(rows.length > limit && page.length ? { cursor: String(page.at(-1)!.sequence) } : {}),
        invocations: page.flatMap((row) => {
          const record = asRecord(row.record, row.sequence);
          if (!record) return [];
          const { observations: _observations, ...summary } = record;
          return [summary];
        }),
      };
    },

    async release(id, claimId) {
      const { db, table } = database();
      await db.update(table)
        .set({ claimExpiresAt: null, claimId: null })
        .where(and(eq(table.id, id), eq(table.claimId, claimId)));
    },

    async update(id, input: AgentInvocationStoreUpdateInput, claimId?: string) {
      const { db, table } = database();
      const [row] = await db.select({ record: table.record, sequence: table.sequence })
        .from(table)
        .where(and(eq(table.id, id), claimId ? eq(table.claimId, claimId) : undefined))
        .limit(1);
      const record = row && asRecord(row.record, row.sequence);
      if (!record) return;

      const updated = publicRecord(applyAgentInvocationStoreUpdate(record, {
        ...input,
        ...(input.error ? { error: { message: "Agent invocation failed." } } : {}),
        ...(input.observation ? { observation: publicObservation(input.observation) } : {}),
      }));
      const rows = await db.update(table)
        .set({
          record: updated as unknown as Record<string, unknown>,
          status: updated.status,
          updatedAt: new Date(updated.updatedAt),
        })
        .where(and(eq(table.id, id), claimId ? eq(table.claimId, claimId) : undefined))
        .returning({ record: table.record, sequence: table.sequence });
      return rows[0] ? asRecord(rows[0].record, rows[0].sequence) : undefined;
    },
  };
}

export const caloriesAgentInvocations = defineAgentInvocations({
  store: createD1AgentInvocationStore(),
});
