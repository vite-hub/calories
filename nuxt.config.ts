import { vitehubServerEnv } from "./vitehub.env.ts";

const domain = "calories.onmax.me";

export default defineNuxtConfig({
  buildDir: ".nuxt",
  compatibilityDate: "2026-07-24",
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [{ name: "color-scheme", content: "light dark" }],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Figtree:wght@400;500;600;700&display=swap" },
      ],
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
        routes: [{ pattern: domain, custom_domain: true }],
        // Telegram replies link to the dashboard from Workflows, where no request URL exists.
        vars: { VITEHUB_DEPLOYMENT_URL: `https://${domain}` },
        workers_dev: false,
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
