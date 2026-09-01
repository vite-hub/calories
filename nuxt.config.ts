import { vitehubServerEnv } from "./vitehub.env";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-24",
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [{ name: "color-scheme", content: "light dark" }],
      title: "Calories",
    },
  },
  modules: ["@nuxt/ui", "vite-hub/nuxt"],
  vitehub: {
    preset: "cloudflare",
    agent: true,
    console: true,
    blob: {
      serve: { route: "/photos" },
    },
    database: {
      driver: "d1",
      databaseName: "vitehub-calories",
    },
  },
  css: ["~/assets/main.css"],
  ui: {
    colorMode: true,
  },
  ssr: false,
  icon: {
    clientBundle: {
      scan: {
        globInclude: [
          "app/**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}",
          "layers/**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}",
          "modules/**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}",
          "node_modules/vite-hub/dist/console/runtime/**/*.{vue,js,ts}",
        ],
        globExclude: [
          ".nuxt",
          ".output",
          ".vitehub",
          "build",
          "coverage",
          "dist",
          "test",
          "tests",
        ],
      },
    },
    provider: "none",
  },
  vite: {
    env: {
      server: vitehubServerEnv,
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
