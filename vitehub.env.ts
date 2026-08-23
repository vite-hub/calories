import { env } from "vite-hub/env";

export const vitehubServerEnv = {
  openrouter: {
    apiKey: env({
      source: env.source("OPENROUTER_API_KEY"),
    }),
  },
  telegram: {
    allowedUserId: env({
      source: env.source("TELEGRAM_ALLOWED_USER_ID"),
    }),
    botToken: env({
      source: env.source("TELEGRAM_TOKEN"),
    }),
    webhookSecret: env({
      optional: true,
      source: env.source("TELEGRAM_WEBHOOK_SECRET"),
    }),
  },
};
