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

[ViteHub](https://vitehub.dev) · Nuxt · Vue · VueUse · Nuxt UI · AI SDK · OpenRouter · Drizzle · Nitro

## Start

Requires Node.js 24.15+ and pnpm 10.

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

Choose a preset in `nuxt.config.ts` and configure its durable storage.

| Host | Preset | Production state |
| --- | --- | --- |
| Cloudflare Workers | `cloudflare` | D1 and R2 |
| Vercel | `vercel` | Hosted libSQL or D1 over HTTP, plus Vercel Blob |
| Netlify | `netlify` | A remote database and Netlify Blobs |
| Deno Deploy | `deno` | Explicit remote database and Blob drivers |
| Node or a container | `node` | SQLite and files on a persistent disk, or hosted stores |

This example uses Cloudflare, D1, and R2. Replace the domain in `nuxt.config.ts` and the production URLs in `package.json` and the Agent hooks before deploying:

```sh
pnpm db:migrate:remote
pnpm run deploy
pnpm telegram:webhook        # preview the change
pnpm telegram:webhook:apply  # apply after the deployment is live
```

See the [host support matrix](https://vitehub.dev/docs/frameworks-hosts/support-matrix) when changing providers. The read-only dashboard shows public photo previews, resized to at most 768 pixels and re-encoded without camera metadata. Originals and their storage paths stay private. The Console runs locally at `http://127.0.0.1:3000/_vitehub` during development.

## Export data

Export production D1 and retained Telegram history with attachments to `.backups/`:

```sh
pnpm data:export
pnpm data:export:database         # D1 only
pnpm data:export -- --thread 42:123
pnpm data:export -- --webhook telegram-webhook-id
```

The full bundle needs production Telegram values in `.env`. ViteHub CLI provides channel history export with thread and webhook filters; database export still uses Wrangler. These filters affect the Telegram archive, not the full D1 dump. `pnpm telegram:history` exports only the channel archive.

Export before recovery: Telegram retains a bounded history window. Compare the archive with D1 and resend only confirmed missing meals to avoid duplicates.

## Checks and guidance

```sh
pnpm run doctor
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions runs Doctor with strict Nuxt, Vue, Nitro, Vite, and TypeScript presets before the other checks. Doctor and ViteHub use pinned `pkg.pr.new` builds. Nuxt Skill Hub refreshes the repository's Codex guidance during `nuxt prepare`.

The dashboard uses Nuxt `useCookie` for saved goals, a local Nuxt UI `UForm` draft for edits, and `useState` for its journal timestamp. VueUse's Nuxt module auto-imports the timer and disposes it when the page unmounts. Meals come from ViteHub's typed `useCollection`; the database supplies the totals.

The photo route resolves a saved meal's photo through ViteHub Blob and caches a JPEG preview in the same store. Photon processes images in Node and Cloudflare without another service. JPEG, PNG, and WebP inputs are supported, up to 10 MB and 8 megapixels.

This template uses Nuxt 5 nightly. Development uses its separate Nitro builder to avoid a Vue CommonJS loading error in the Vite dev runner; production uses the default Nitro Vite environment.

The local Console shows recent Agent sessions. The journal strips original media bytes, private tool values, channel identifiers, and raw errors before persistence.
