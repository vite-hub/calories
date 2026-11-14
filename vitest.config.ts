import { vitehub } from "vite-hub";
import { defineConfig } from "vitest/config";
import { vitehubServerEnv } from "./vitehub.env.ts";

// `vitehub()` generates the Env registry that `useServerEnv()` reads in the Agent hooks.
export default defineConfig({
  plugins: [vitehub({ host: "node", env: { server: vitehubServerEnv } })],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Vite must transform `vite-hub/env`, so it reads the generated registry instead of its placeholder.
    server: { deps: { inline: [/vite-hub/] } },
  },
});
