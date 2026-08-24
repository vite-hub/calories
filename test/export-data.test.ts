import assert from "node:assert/strict";
import test from "node:test";

import { parseExportArgs } from "../scripts/export-data";

test("data export defaults to a timestamped full recovery bundle", () => {
  assert.deepEqual(parseExportArgs([], new Date("2026-08-24T12:34:56.789Z")), {
    databaseOnly: false,
    output: ".backups/calories-2026-08-24T123456789Z",
  });
});

test("data export accepts a database-only custom output", () => {
  assert.deepEqual(parseExportArgs(["--database-only", "--output", ".backups/recovery"]), {
    databaseOnly: true,
    output: ".backups/recovery",
  });
});

test("data export rejects an incomplete output option", () => {
  assert.throws(() => parseExportArgs(["--output"]), /requires a directory/);
});
