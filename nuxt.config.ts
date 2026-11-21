import { vitehubServerEnv } from "./vitehub.env.ts";

// Custom domain of the Cloudflare Worker. Without one, the Worker deploys to workers.dev.
const domain = process.env.CLOUDFLARE_WORKER_DOMAIN;

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
    host: "cloudflare",
    agent: true,
    // Production links to console.vitehub.dev, which signs each request.
    console: true,
    blob: {
      serve: false,
      // Meal photo previews. Photon runs on Workers without the paid Images binding.
      images: { transformer: "photon", sizes: [768] },
    },
    database: {
      driver: "cloudflare",
      databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
      databaseName: "vitehub-calories",
    },
    env: {
      server: vitehubServerEnv,
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
  },
  $development: {
    experimental: {
      // Nuxt 5's Vite dev runner currently evaluates Vue's CommonJS entry as ESM.
      nitroViteEnvironment: false,
    },
    vitehub: {
      host: "node",
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
        routes: domain ? [{ pattern: domain, custom_domain: true }] : undefined,
        // Telegram replies link to the dashboard from Workflows, where no request URL exists.
        vars: domain ? { VITEHUB_DEPLOYMENT_URL: `https://${domain}` } : undefined,
        workers_dev: !domain,
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
});
