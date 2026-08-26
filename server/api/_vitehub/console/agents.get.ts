import { defineEventHandler, setResponseHeader } from "h3";

export default defineEventHandler((event) => {
  setResponseHeader(event, "cache-control", "no-store");
  return { agents: ["calories"] };
});
