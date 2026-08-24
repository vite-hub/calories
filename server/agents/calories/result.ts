type ToolResult = {
  name?: string;
  output?: unknown;
  toolName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function verifiedMealId(toolResults: readonly ToolResult[]): string | undefined {
  const verification = toolResults.findLast((result) =>
    (result.toolName ?? result.name) === "db_query"
  );
  if (!verification || !Array.isArray(verification.output) || verification.output.length !== 1) {
    return;
  }

  const [row] = verification.output;
  return isRecord(row) && typeof row.id === "string" && row.id.trim()
    ? row.id
    : undefined;
}
