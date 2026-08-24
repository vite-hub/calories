import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { verifiedMealId } from "../server/agents/calories/result";

describe("verifiedMealId", () => {
  it("returns the id from the final single-row verification query", () => {
    assert.equal(verifiedMealId([
      { toolName: "db_query", output: [{ id: "older-meal" }] },
      { toolName: "db_exec", output: { changes: 1 } },
      { toolName: "db_query", output: [{ id: "verified-meal" }] },
    ]), "verified-meal");
  });

  it("does not reuse an earlier id when the final query verifies deletion", () => {
    assert.equal(verifiedMealId([
      { toolName: "db_query", output: [{ id: "deleted-meal" }] },
      { toolName: "db_exec", output: { changes: 1 } },
      { toolName: "db_query", output: [] },
    ]), undefined);
  });

  it("does not choose an ambiguous row", () => {
    assert.equal(verifiedMealId([
      { name: "db_query", output: [{ id: "one" }, { id: "two" }] },
    ]), undefined);
  });
});
