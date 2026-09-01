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
  "channel.effect.content",
  "channel.effect.intent",
  "channel.effect.kind",
  "finish.reason",
  "input.hasMessages",
  "input.hasPrompt",
  "invocation.durationMs",
  "model.call.id",
  "result.hasValue",
  "runtime.name",
  "step.id",
  "tool.durationMs",
  "tool.hasInput",
  "tool.hasOutput",
  "tool.id",
  "tool.name",
  "tool.title",
  "usage.hasCost",
  "usage.reasoningOutputTokens",
  "usage.reasoningTokens",
  "usage.totalTokens",
  "vitehub.action.name",
  "vitehub.activity.kind",
  "vitehub.activity.detail",
  "vitehub.activity.group",
  "vitehub.activity.title",
  "vitehub.agent.configurationTruncated",
  "vitehub.inspect.target",
  "vitehub.observation.truncated",
]);

const publicToolTitles: Record<string, string> = {
  blob_edit: "Updated photo storage",
  db_exec: "Updated database",
  db_query: "Queried database",
  db_schema: "Inspected database schema",
  materialize_sources: "Materialized ViteHub workspace",
  transcribe: "Transcribed voice message",
};

const databaseCapabilityError = /Capability ["']db["'] requires the database primitive|@vite-hub\/database\/drizzle/;

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function publicMaterializationPayload(value: unknown, direction: "input" | "output"): Record<string, unknown> {
  const payload = record(value);
  if (direction === "input") {
    const sources = Array.isArray(payload?.sources)
      ? payload.sources.flatMap((source) => stringValue(source) ? [stringValue(source)!] : [])
      : [];
    return {
      path: stringValue(payload?.path) ?? "workspace root",
      ...(sources.length ? { sources } : {}),
    };
  }

  const sources = Array.isArray(payload?.sources)
    ? payload.sources.flatMap((source) => {
        const name = stringValue(record(source)?.source) ?? stringValue(source);
        return name ? [name] : [];
      })
    : [];
  return {
    ...(finiteNumber(payload?.bytes) !== undefined ? { bytes: finiteNumber(payload?.bytes) } : {}),
    ...(finiteNumber(payload?.directories) !== undefined ? { directories: finiteNumber(payload?.directories) } : {}),
    ...(finiteNumber(payload?.durationMs) !== undefined ? { durationMs: finiteNumber(payload?.durationMs) } : {}),
    ...(finiteNumber(payload?.files) !== undefined ? { files: finiteNumber(payload?.files) } : {}),
    ...(sources.length ? { sources } : {}),
    summary: stringValue(payload?.summary) ?? "ViteHub materialized the workspace sources.",
  };
}

function publicToolPayload(
  toolName: string,
  value: unknown,
  direction: "input" | "output",
): Record<string, unknown> {
  if (toolName === "materialize_sources") return publicMaterializationPayload(value, direction);

  if (direction === "input") {
    return {
      summary: toolName === "transcribe"
        ? "Private audio input omitted."
        : toolName === "blob_edit"
          ? "Private photo operation omitted."
          : toolName.startsWith("db_")
            ? "Private database request omitted."
            : "Private tool input omitted.",
    };
  }

  if (toolName === "db_query") {
    const rows = Array.isArray(value) ? value.length : finiteNumber(record(value)?.rows);
    if (rows !== undefined) {
      return { rows, summary: `Returned ${rows} private row${rows === 1 ? "" : "s"}.` };
    }
  }
  const payload = record(value);
  const changes = finiteNumber(payload?.changes);
  return {
    ...(changes !== undefined ? { changes } : {}),
    summary: toolName === "transcribe"
      ? "Transcription completed; private text omitted."
      : toolName === "blob_edit"
        ? "Photo storage operation completed; private paths omitted."
        : toolName.startsWith("db_")
          ? "Database operation completed; private values omitted."
          : "Tool completed; private output omitted.",
  };
}

function publicNamedItems(value: unknown, key: string): Array<Record<string, string>> | undefined {
  if (!Array.isArray(value)) return;
  const items = value.flatMap((item) => {
    const name = stringValue(record(item)?.[key]);
    return name ? [{ [key]: name }] : [];
  });
  return items.length ? items : undefined;
}

function publicAgentConfiguration(value: unknown): Record<string, unknown> | undefined {
  const configuration = record(value);
  if (!configuration) return;

  const agent = record(configuration.agent);
  const driver = record(configuration.driver);
  const model = record(driver?.model);
  const runtime = record(configuration.runtime);
  const workspace = record(configuration.workspace);
  const publicAgent = agent && {
    ...(stringValue(agent.name) ? { name: stringValue(agent.name) } : {}),
    ...(stringValue(agent.version) ? { version: stringValue(agent.version) } : {}),
  };
  const publicModel = model && {
    ...(stringValue(model.id) ? { id: stringValue(model.id) } : {}),
    ...(stringValue(model.provider) ? { provider: stringValue(model.provider) } : {}),
  };
  const publicDriver = driver && {
    ...(stringValue(driver.kind) ? { kind: stringValue(driver.kind) } : {}),
    ...(publicModel && Object.keys(publicModel).length ? { model: publicModel } : {}),
    ...(stringValue(driver.provider) ? { provider: stringValue(driver.provider) } : {}),
  };
  const publicRuntime = runtime && {
    ...(stringValue(runtime.name) ? { name: stringValue(runtime.name) } : {}),
  };
  const publicWorkspace = workspace && {
    ...(stringValue(workspace.mode) ? { mode: stringValue(workspace.mode) } : {}),
    ...(stringValue(workspace.name) ? { name: stringValue(workspace.name) } : {}),
  };
  const capabilities = publicNamedItems(configuration.capabilities, "id");
  const tools = publicNamedItems(configuration.tools, "name");
  const result = {
    ...(publicAgent && Object.keys(publicAgent).length ? { agent: publicAgent } : {}),
    ...(capabilities ? { capabilities } : {}),
    ...(publicDriver && Object.keys(publicDriver).length ? { driver: publicDriver } : {}),
    ...(publicRuntime && Object.keys(publicRuntime).length ? { runtime: publicRuntime } : {}),
    ...(tools ? { tools } : {}),
    ...(publicWorkspace && Object.keys(publicWorkspace).length ? { workspace: publicWorkspace } : {}),
  };
  return Object.keys(result).length ? result : undefined;
}

function triggerMessages(value?: unknown) {
  const messages = Array.isArray(value) ? value : [];
  const retained = messages.flatMap((candidate) => {
    const message = record(candidate);
    if (!message) return [];
    const role = message.role;
    if (role !== "user" && role !== "assistant") return [];

    const parts = Array.isArray(message.parts)
      ? message.parts.flatMap((part) => {
          const item = record(part);
          if (typeof item?.text === "string" && item.text.trim()) return [item.text.trim()];
          if (item?.type !== "file") return [];
          const mediaType = stringValue(item.mediaType) ?? "";
          if (mediaType.startsWith("image/")) return ["[Photo attached]"];
          if (mediaType.startsWith("audio/")) return ["[Voice message]"];
          return ["[Attachment omitted]"];
        })
      : [];
    const text = parts.join("\n\n").slice(0, 4_096);
    return text ? [{ role, text }] : [];
  }).slice(-20);

  if (!retained.length) {
    return [{
      id: "calories-trigger",
      parts: [{
        id: "calories-trigger-text",
        text: "Message content was not retained for this older Telegram session.",
        type: "text",
      }],
      role: "user",
    }];
  }

  return retained.map((message, index) => ({
    id: `calories-message-${index}`,
    parts: [{
      id: `calories-message-${index}-text`,
      text: message.text,
      type: "text",
    }],
    role: message.role,
  }));
}

function publicInvocationError(error: unknown): { message: string; name: string } {
  const candidate = error && typeof error === "object" ? error as { message?: unknown; name?: unknown } : {};
  const message = typeof candidate.message === "string" ? candidate.message : String(error ?? "");
  const name = typeof candidate.name === "string" ? candidate.name : "";

  if (name === "Database unavailable" || databaseCapabilityError.test(message)) {
    return {
      message: "This deployment could not load its database adapter, so the request was not saved. Retry after the deployment has been updated.",
      name: "Database unavailable",
    };
  }

  return {
    message: "The agent stopped before completing this request. Use the trace ID shown in this session to find the matching Worker logs.",
    name: "Invocation failed",
  };
}

export function publicObservation(entry: TraceEventLogEntry): TraceEventLogEntry {
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry.attributes ?? {})) {
    if (!publicAttributeKeys.has(key)) continue;
    if (typeof value === "string") attributes[key] = value.slice(0, key === "channel.effect.content" ? 4_096 : 256);
    else if (typeof value === "number" && Number.isFinite(value)) attributes[key] = value;
    else if (typeof value === "boolean" || value === null) attributes[key] = value;
  }

  const configuration = publicAgentConfiguration(entry.attributes?.["vitehub.agent.configuration"]);
  if (configuration) attributes["vitehub.agent.configuration"] = configuration;

  const isTelegramInvocation = entry.attributes?.["channel.delivery.provider"] === "telegram";
  if (
    isTelegramInvocation
    && entry.attributes?.["channel.effect.kind"] === "reply"
    && !stringValue(attributes["channel.effect.content"])
  ) {
    attributes["channel.effect.content"] = "Reply content was not retained for this older Telegram session.";
  }
  if (
    entry.name === "agent.invocation.start"
    && (
      isTelegramInvocation
      || entry.attributes?.["input.hasMessages"] === true
      || entry.attributes?.["input.hasPrompt"] === true
    )
  ) {
    attributes["input.messages"] = triggerMessages(entry.attributes?.["input.messages"]);
  }

  if (
    entry.name === "agent.invocation.finish"
    && (isTelegramInvocation || entry.attributes?.["result.hasValue"] === true)
  ) {
    attributes["result.text"] = "Completed the meal request and replied on Telegram.";
  }

  const toolName = stringValue(entry.attributes?.["tool.name"]);
  if (toolName && publicToolTitles[toolName]) {
    attributes["vitehub.activity.title"] = publicToolTitles[toolName];
  }
  if (toolName) {
    if (entry.attributes?.["tool.input"] !== undefined || entry.attributes?.["tool.hasInput"] === true) {
      attributes["tool.input"] = publicToolPayload(toolName, entry.attributes?.["tool.input"], "input");
    }
    if (entry.attributes?.["tool.output"] !== undefined || entry.attributes?.["tool.hasOutput"] === true) {
      attributes["tool.output"] = publicToolPayload(toolName, entry.attributes?.["tool.output"], "output");
    }
  }
  if (toolName === "materialize_sources") {
    attributes["vitehub.activity.kind"] = "preparation";
    const output = record(attributes["tool.output"]);
    const detail = stringValue(output?.summary);
    if (detail) attributes["vitehub.activity.detail"] = detail;
  }

  if (entry.type === "error" || entry.name.endsWith(".error")) {
    const error = publicInvocationError({
      message: entry.attributes?.["error.message"],
      name: entry.attributes?.["error.name"],
    });
    attributes["error.message"] = error.message;
    attributes["vitehub.activity.title"] = error.name;
  }

  return {
    ...entry,
    ...(Object.keys(attributes).length ? { attributes } : { attributes: undefined }),
  };
}

type PublicAgentInvocationRecord = AgentInvocationRecord & { title: string };

export function publicRecord(record: AgentInvocationRecord): PublicAgentInvocationRecord {
  const sanitized = record.observations.map(publicObservation);
  const hasReply = sanitized.some((observation) => (
    observation.attributes?.["channel.effect.kind"] === "reply"
    && stringValue(observation.attributes?.["channel.effect.content"])
  ));
  const observations = hasReply
    ? sanitized.map((observation) => {
        if (observation.name !== "agent.invocation.finish" || !observation.attributes?.["result.text"]) {
          return observation;
        }
        const { "result.text": _resultText, ...attributes } = observation.attributes;
        return { ...observation, attributes };
      })
    : sanitized;
  const configured = new Set<string>();
  return {
    agentName: record.agentName,
    channelId: "telegram",
    ...(record.cancelledAt ? { cancelledAt: record.cancelledAt } : {}),
    ...(record.completedAt ? { completedAt: record.completedAt } : {}),
    createdAt: record.createdAt,
    cursor: record.cursor,
    ...(record.error ? { error: publicInvocationError(record.error) } : {}),
    ...(record.failedAt ? { failedAt: record.failedAt } : {}),
    id: record.id,
    origin: "telegram",
    observations: observations.filter((observation) => {
      if (observation.name !== "vitehub.agent.configured") return true;
      const signature = JSON.stringify(observation.attributes ?? {});
      if (configured.has(signature)) return false;
      configured.add(signature);
      return true;
    }),
    ...(record.observationsTruncated ? { observationsTruncated: true } : {}),
    ...(record.startedAt ? { startedAt: record.startedAt } : {}),
    status: record.status,
    title: "Meal request",
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
    const record = row ? asRecord(row.record, row.sequence) : undefined;
    return record ? publicRecord(record) : undefined;
  };

  return {
    async claim(id, claimId, leaseMs, options) {
      const { db, table } = database();
      const now = Date.now();
      const claimToken = globalThis.crypto.randomUUID();
      const rows = await db.update(table)
        .set({ claimExpiresAt: now + leaseMs, claimId, claimToken })
        .where(and(
          eq(table.id, id),
          options?.replaceExisting
            ? undefined
            : or(
                isNull(table.claimId),
                eq(table.claimId, claimId),
                lte(table.claimExpiresAt, now),
                options?.replaceClaimToken
                  ? eq(table.claimToken, options.replaceClaimToken)
                  : undefined,
              ),
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

    async getClaimToken(id) {
      const { db, table } = database();
      const [row] = await db.select({ claimToken: table.claimToken })
        .from(table)
        .where(eq(table.id, id))
        .limit(1);
      return row?.claimToken ?? undefined;
    },

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
          const { observations: _observations, ...summary } = publicRecord(record);
          return [summary];
        }),
      };
    },

    async release(id, claimId) {
      const { db, table } = database();
      await db.update(table)
        .set({ claimExpiresAt: null, claimId: null, claimToken: null })
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
        ...(input.error ? { error: publicInvocationError(input.error) } : {}),
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
