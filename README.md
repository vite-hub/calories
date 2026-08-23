# ViteHub Calories

A starter template for experimenting with a ViteHub Agent. Send a meal by text, photo, or voice; the Agent estimates calories and protein, saves the meal, and shows it in a Nuxt dashboard.

> A working example, not a framework. Replace anything you do not need.

> [!WARNING]
> Calorie, protein, and portion estimates can be inaccurate. This project is an experiment, not medical or dietary advice. Run your own evals against representative meals and trusted nutrition data before relying on any model, prompt, or workflow for health decisions.

## Features

- 📸 **Log meals** from text, photos, or voice messages
- 🧠 **Get calorie and protein estimates** with portions and confidence
- ✏️ **Correct or remove entries** and ask questions about your journal
- 📊 **Track daily totals and goals** while browsing your meal history

This template picks Telegram and OpenRouter. Choose the ViteHub deployment preset and storage providers that fit your host.

## Build with ViteHub

- 🌍 **Deploy across hosts** with Cloudflare, Vercel, Netlify, Deno, or Node presets
- 💬 **Connect different channels** with Telegram, Discord, Slack, Teams, GitHub, HTTP, web chat, or an app-owned adapter
- 🧠 **Bring any AI SDK model** such as GLM, GPT, Claude, Gemini, or another provider model
- 🤖 **Run coding harnesses** with Codex, Claude Code, or a custom harness adapter
- ⚙️ **Use custom execution** when application code should run instead of a model or harness
- 🧰 **Compose Capabilities** for tools, databases, files, transcription, usage, and product-specific actions
- 📁 **Give Agents context** through scoped Workspaces, Sources, and Skills
- 💾 **Use portable server primitives** for databases, Blob storage, KV, auth, and environment values
- ⏱️ **Run work beyond requests** with queues, workflows, and schedules
- 📨 **Send email** through a provider adapter without coupling the Agent to one service
- 🧩 **Define your own integrations** with custom Channels, Capabilities, Drivers, and provider adapters
- 🔎 **Inspect runtime wiring locally** through generated files, runtime APIs, and CLI commands

## Stack

[ViteHub](https://vitehub.dev) · Nuxt · Vue · Nuxt UI · AI SDK · OpenRouter · Drizzle · Nitro

## Start

Requires Node.js 24+ and pnpm 10.

```sh
git clone https://github.com/vite-hub/calories.git
cd calories
pnpm install
cp .env.example .env
```

Add `OPENROUTER_API_KEY`, `TELEGRAM_TOKEN`, and your numeric `TELEGRAM_ALLOWED_USER_ID` to `.env`, then run:

```sh
pnpm db:migrate
pnpm dev
```

Open <http://localhost:3000>. Start customizing in `server/agents/calories/agent.ts`, its `instructions.md`, and `nuxt.config.ts`.

## Deploy

ViteHub supports five deployment presets. Pick one in `nuxt.config.ts`, then configure durable database and Blob storage for that host.

| Host | Preset | Production state |
| --- | --- | --- |
| Cloudflare Workers | `cloudflare` | D1 and R2 |
| Vercel | `vercel` | Hosted libSQL or D1 over HTTP, plus Vercel Blob |
| Netlify | `netlify` | A remote database and Netlify Blobs |
| Deno Deploy | `deno` | Explicit remote database and Blob drivers |
| Node or a container | `node` | SQLite and files on a persistent disk, or hosted stores |

Not every ViteHub Capability has native output on every host. Check the [host support matrix](https://vitehub.dev/docs/frameworks-hosts/support-matrix), update the provider-specific configuration and deployment scripts, then build:

```sh
pnpm build
```

The repository currently includes Cloudflare, D1, and R2 configuration as one working deployment example—not as ViteHub's default. The generated Wrangler configuration publishes the Worker only at `https://calories.onmax.me`:

```sh
pnpm db:migrate:remote
pnpm run deploy
```

Register the Telegram webhook after the deployment is live. Inspecting the plan is read-only; the second command applies it:

```sh
pnpm telegram:webhook
pnpm telegram:webhook:apply
```

Download the retained Telegram conversation and its attachments for recovery:

```sh
pnpm telegram:history
```

The archive is written to `.backups/telegram-history/`. Telegram retains a bounded history window, so export it before attempting to replay missed meals.

## Agent session reader

The read-only Agent invocation console is enabled for local development. Start the app and open `http://127.0.0.1:3000/_vitehub`:

```sh
pnpm dev
```

The console is loopback-only and is not included in the production build at `calories.onmax.me`.
