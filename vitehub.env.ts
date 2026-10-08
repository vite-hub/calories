import { env } from "vite-hub/env";

export const vitehubServerEnv = {
  app: {
    url: env({
      default: "http://localhost:3000",
      source: env.source("VITEHUB_DEPLOYMENT_URL"),
    }),
  },
  openrouter: {
    apiKey: env({
      secret: true,
      source: env.source("OPENROUTER_API_KEY"),
    }),
  },
  telegram: {
    allowedUserId: env({
      source: env.source("TELEGRAM_ALLOWED_USER_ID"),
    }),
    botToken: env({
      secret: true,
      source: env.source("TELEGRAM_TOKEN"),
    }),
    webhookSecret: env({
      optional: true,
      secret: true,
      source: env.source("TELEGRAM_WEBHOOK_SECRET"),
    }),
  },
};
