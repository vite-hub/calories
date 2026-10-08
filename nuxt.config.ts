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
  modules: ["@nuxt/ui", "@vueuse/nuxt", "vite-hub/nuxt", "nuxt-skill-hub"],
  skillHub: {
    targets: ["codex"],
  },
  vitehub: {
    preset: "cloudflare",
    agent: true,
    console: process.env.NODE_ENV === "development",
    blob: {
      serve: false,
    },
    database: {
      driver: "d1",
      databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
      databaseName: "vitehub-calories",
    },
  },
  css: ["~/assets/main.css"],
  ui: {
    colorMode: true,
    fonts: false,
  },
  // Calendar days use the visitor's local timezone.
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
      database: { driver: "sqlite" },
    },
    nitro: {
      preset: "node-server",
    },
  },
  devtools: { enabled: false },
  nitro: {
    // Photon initializes synchronously and needs the compiled WebAssembly module.
    wasm: { lazy: false },
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
