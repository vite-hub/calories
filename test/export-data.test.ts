import assert from "node:assert/strict";
import test from "node:test";

import { parseExportArgs } from "../scripts/export-data";

test("data export defaults to a timestamped full recovery bundle", () => {
  assert.deepEqual(parseExportArgs([], new Date("2026-08-24T12:34:56.789Z")), {
    databaseOnly: false,
    output: ".backups/calories-2026-08-24T123456789Z",
    thread: undefined,
    webhook: undefined,
  });
});

test("data export accepts a database-only custom output", () => {
  assert.deepEqual(parseExportArgs(["--database-only", "--output", ".backups/recovery"]), {
    databaseOnly: true,
    output: ".backups/recovery",
    thread: undefined,
    webhook: undefined,
  });
});

test("data export rejects an incomplete output option", () => {
  assert.throws(() => parseExportArgs(["--output"]), /requires a directory/);
});

test("data export accepts channel filters", () => {
  assert.deepEqual(parseExportArgs(
    ["--thread", "42:7", "--webhook", "telegram"],
    new Date("2026-08-24T12:34:56.789Z"),
  ), {
    databaseOnly: false,
    output: ".backups/calories-2026-08-24T123456789Z",
    thread: "42:7",
    webhook: "telegram",
  });
});

test("data export accepts the pnpm argument separator", () => {
  assert.equal(parseExportArgs(["--", "--thread", "42:7"]).thread, "42:7");
});
