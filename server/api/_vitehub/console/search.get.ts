import { defineCollection } from "vite-hub/source";
import { defineCollectionHandler } from "vite-hub/source/server";
import type { AgentInvocationRecord, AgentInvocationSummary } from "vite-hub/agent/server";
import { caloriesAgentInvocations } from "../../../utils/agent-invocations";

interface ConsoleSearchQuery {
  search?: string;
}

interface ConsoleSearchRow {
  excerpt?: string;
  summary: AgentInvocationSummary;
}

interface StandardSchema<Input, Output> {
  "~standard": {
    types?: { input: Input; output: Output };
    validate(value: unknown): { value: Output } | { issues: Array<{ message: string }> };
    vendor: string;
    version: 1;
  };
}

const cursorSchema: StandardSchema<string, string> = { "~standard": {
  version: 1 as const,
  vendor: "vitehub-calories-console",
  validate(value: unknown): { value: string } | { issues: Array<{ message: string }> } {
    return typeof value === "string"
      ? { value }
      : { issues: [{ message: "Console search cursor must be a string." }] };
  },
} };

const querySchema: StandardSchema<ConsoleSearchQuery, ConsoleSearchQuery> = { "~standard": {
  version: 1 as const,
  vendor: "vitehub-calories-console",
  validate(value: unknown): { value: ConsoleSearchQuery } | { issues: Array<{ message: string }> } {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { issues: [{ message: "Console search query must be an object." }] };
    }
    const query = value as Record<string, unknown>;
    if (Object.keys(query).some((key) => key !== "search")) {
      return { issues: [{ message: "Console search only accepts a search query." }] };
    }
    if (query.search === undefined) return { value: {} };
    if (typeof query.search !== "string") {
      return { issues: [{ message: "Console search must have one string value." }] };
    }
    const search = query.search.trim();
    if (search.length > 256) {
      return { issues: [{ message: "Console search must be at most 256 characters." }] };
    }
    return { value: search ? { search } : {} };
  },
} };

function searchableStrings(value: unknown, strings: string[], ancestors = new WeakSet<object>()): void {
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (!value || typeof value !== "object" || ancestors.has(value)) return;
  ancestors.add(value);
  try {
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      searchableStrings(child, strings, ancestors);
    }
  }
  finally {
    ancestors.delete(value);
  }
}

export function consoleSearchExcerpt(record: AgentInvocationRecord, search: string): string | undefined {
  const strings: string[] = [];
  searchableStrings(record.observations, strings);
  searchableStrings(record.error, strings);
  const normalizedSearch = search.toLowerCase();
  const match = strings.find((value) => value.toLowerCase().includes(normalizedSearch));
  if (!match) return;
  const text = match.replace(/\s+/g, " ").trim();
  const index = text.toLowerCase().indexOf(normalizedSearch);
  const start = Math.max(0, index - 56);
  const end = Math.min(text.length, index + search.length + 104);
  return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function transformSearchRow(row: ConsoleSearchRow) {
  return {
    agentName: row.summary.agentName,
    context: row.summary.channelId || row.summary.origin || row.summary.id,
    ...(row.excerpt ? { excerpt: row.excerpt } : {}),
    id: row.summary.id,
    status: row.summary.status,
    updatedAt: row.summary.updatedAt || row.summary.startedAt || row.summary.createdAt,
  };
}

const collection = defineCollection<
  ConsoleSearchRow,
  typeof cursorSchema,
  typeof querySchema,
  typeof transformSearchRow
>(
  async ({ cursor, limit, query, signal }) => {
    signal?.throwIfAborted();
    const page = await caloriesAgentInvocations.list({
      ...(cursor ? { cursor } : {}),
      limit: query.search ? 100 : limit,
    });
    const rows = await Promise.all(page.invocations.map(async (summary) => {
      if (!query.search) return { summary };
      const record = await caloriesAgentInvocations.get(summary.id);
      const excerpt = record ? consoleSearchExcerpt(record, query.search) : undefined;
      return { ...(excerpt ? { excerpt } : {}), summary };
    }));
    signal?.throwIfAborted();
    return rows.filter((row) => !query.search || row.excerpt).slice(0, limit);
  },
  {
    cursor: (row) => row.summary.cursor,
    cursorSchema,
    defaultLimit: 12,
    maxLimit: 24,
    querySchema,
    transform: transformSearchRow,
  },
);

export default defineCollectionHandler(collection);
