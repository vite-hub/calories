import { defineConfig } from "vite";
import { vitehub } from "vite-hub";

import { vitehubServerEnv } from "./vitehub.env";

export default defineConfig({
  env: {
    server: vitehubServerEnv,
  },
  plugins: vitehub({
    agent: true,
    preset: "cloudflare",
  }),
});
