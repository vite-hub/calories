# ViteHub Calories

Calories is a runnable ViteHub Agent template, not a prescribed application architecture. Telegram, OpenRouter models, Cloudflare D1/R2/Workers, and Nuxt UI are replaceable examples.

## Product contract

- Accept meal text, photos, and voice from the configured private input; keep the dashboard read-only and original photos private.
- Treat the persisted database as authoritative for meals and totals.
- Claim that a meal was saved only after its items, calorie and protein totals, presentation payload, and database write succeed.

## Change contract

- Keep the channel, AI provider, models, Capabilities, storage, UI, and deployment preset explicit at their current configuration points. Prefer replacing or deleting one choice over abstracting for hypothetical variants.
- Keep meal logic portable and isolate provider-specific bindings, migrations, and deployment commands.
- Keep secret values in the environment; source and examples may name variables only.
- Treat production deploys, webhook changes, and remote data migrations as separate mutations that require an explicit request.
- Match proof to the changed boundary: `git diff --check` for documentation; focused tests and typecheck for code; the real provider path for provider behavior. Keep local, build, deployment, and live-service proof distinct.
- Push verified changes directly to current `main` unless the user requests a branch or pull request. Fetch first, require a clean fast-forward, and never force-push.

<!-- nuxt-skill-hub:start -->
Use the nuxt-vitehub-calories skill as the Nuxt router/entrypoint for tasks in this repository.
<!-- nuxt-skill-hub:end -->
