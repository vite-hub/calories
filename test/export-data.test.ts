import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { exportData, parseExportArgs } from "../scripts/export-data";

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

test("a full export rejects the development URL before starting a remote command", () => {
  const directory = mkdtempSync(join(tmpdir(), "calories-export-"));
  const previousDirectory = process.cwd();
  const previousUrl = process.env.VITEHUB_DEPLOYMENT_URL;
  try {
    writeFileSync(join(directory, ".env"), "VITEHUB_DEPLOYMENT_URL=http://localhost:3000\n");
    delete process.env.VITEHUB_DEPLOYMENT_URL;
    process.chdir(directory);
    assert.throws(() => exportData(parseExportArgs([])), /production HTTPS origin/);
  } finally {
    process.chdir(previousDirectory);
    if (previousUrl === undefined) delete process.env.VITEHUB_DEPLOYMENT_URL;
    else process.env.VITEHUB_DEPLOYMENT_URL = previousUrl;
    rmSync(directory, { recursive: true });
  }
});
