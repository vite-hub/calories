import { createError, defineEventHandler, getQuery, setResponseHeader } from "h3";
import { caloriesAgentInvocations } from "../../../../utils/agent-invocations";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const query = getQuery(event);
  const limit = query.limit === undefined ? undefined : Number(query.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw createError({ message: "Invalid invocation limit.", statusCode: 400 });
  }
  return caloriesAgentInvocations.list({
    ...(typeof query.cursor === "string" && query.cursor ? { cursor: query.cursor } : {}),
    ...(limit === undefined ? {} : { limit }),
  });
});
