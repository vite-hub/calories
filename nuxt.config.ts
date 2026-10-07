import { vitehubServerEnv } from "./vitehub.env.ts";

export default defineNuxtConfig({
  buildDir: ".nuxt",
  compatibilityDate: "2026-07-24",
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [{ name: "color-scheme", content: "light dark" }],
      title: "Calories",
    },
  },
  modules: ["@nuxt/ui", "vite-hub/nuxt", "nuxt-skill-hub"],
  skillHub: {
    targets: ["codex"],
  },
  vitehub: {
    preset: "cloudflare",
    agent: true,
    console: false,
    blob: {
      serve: false,
    },
    database: {
      driver: "d1",
      databaseName: "vitehub-calories",
    },
  },
  css: ["~/assets/main.css"],
  ui: {
    colorMode: true,
    fonts: false,
  },
  ssr: false,
  icon: {
    clientBundle: {
      scan: true,
    },
    provider: "none",
  },
  vite: {
    root: import.meta.dirname,
    env: {
      server: vitehubServerEnv,
    },
  },
  $development: {
    experimental: {
      // Nuxt 5's Vite dev runner currently evaluates Vue's CommonJS entry as ESM.
      nitroViteEnvironment: false,
    },
    vitehub: {
      preset: "node",
      console: true,
    },
    nitro: {
      preset: "node-server",
    },
  },
  devtools: { enabled: false },
  nitro: {
    cloudflare: {
      wrangler: {
        observability: { enabled: true },
        preview_urls: false,
        routes: [{ pattern: "calories.onmax.me", custom_domain: true }],
        workers_dev: false,
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
