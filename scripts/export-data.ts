import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export interface ExportOptions {
  databaseOnly: boolean;
  output: string;
}

function defaultOutput(now = new Date()): string {
  return `.backups/calories-${now.toISOString().replaceAll(":", "").replaceAll(".", "")}`;
}

export function parseExportArgs(args: string[], now = new Date()): ExportOptions {
  let databaseOnly = false;
  let output = defaultOutput(now);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--database-only") {
      databaseOnly = true;
      continue;
    }
    if (argument === "--output") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--output requires a directory");
      output = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { databaseOnly, output };
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
}

export function exportData(options: ExportOptions): string {
  if (!options.databaseOnly && !existsSync(resolve(".env"))) {
    throw new Error("Full export requires .env with the production Telegram credentials. Use --database-only to export D1 alone.");
  }

  const output = resolve(options.output);
  if (existsSync(output)) throw new Error(`Export directory already exists: ${output}`);
  mkdirSync(output, { recursive: true });

  run(process.execPath, ["--env-file-if-exists=.env", "node_modules/nuxt/bin/nuxt.mjs", "build"]);
  run(process.execPath, [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "export",
    "DB",
    "--remote",
    "--config",
    ".output/server/wrangler.json",
    "--output",
    resolve(output, "database.sql"),
  ]);

  if (!options.databaseOnly) {
    run(process.execPath, [
      "--env-file=.env",
      "node_modules/vite-hub/dist/bin.js",
      "channels",
      "history",
      "--agent",
      "calories",
      "--channel",
      "telegram",
      "--stage",
      "production",
      "--url",
      "https://calories.onmax.me",
      "--output",
      resolve(output, "telegram"),
    ]);
  }

  writeFileSync(resolve(output, "manifest.json"), `${JSON.stringify({
    createdAt: new Date().toISOString(),
    database: "database.sql",
    telegram: options.databaseOnly ? null : "telegram",
  }, null, 2)}\n`);

  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const output = exportData(parseExportArgs(process.argv.slice(2)));
    console.log(`Recovery bundle written to ${output}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
