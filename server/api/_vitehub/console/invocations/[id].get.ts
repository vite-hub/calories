import { createError, defineEventHandler, getRouterParam, setResponseHeader } from "h3";
import { caloriesAgentInvocations } from "../../../../utils/agent-invocations";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  const id = getRouterParam(event, "id");
  const record = id ? await caloriesAgentInvocations.get(id) : undefined;
  if (!record) throw createError({ message: "Agent invocation not found.", statusCode: 404 });
  const { observations, ...invocation } = record;
  return { invocation, observations };
});
