import { vitehub } from "vite-hub";
import { defineConfig } from "vitest/config";
import { vitehubServerEnv } from "./vitehub.env.ts";

// `vitehub()` generates the Env registry that `useServerEnv()` reads in the Agent hooks.
// The tests import the Agent Definition directly, so they need no Agent routes or State.
export default defineConfig({
  plugins: [vitehub({ host: "node", agent: false, env: { server: vitehubServerEnv } })],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
