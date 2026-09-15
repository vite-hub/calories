import assert from "node:assert/strict";
import { createRequire, findPackageJSON } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const nuxtRequire = createRequire(require.resolve("nuxt/package.json"));
const uiRequire = createRequire(findPackageJSON("@nuxt/ui", import.meta.url)!);
const nuxtVue = nuxtRequire("vue");
const uiVue = uiRequire("vue");
const { renderToString } = createRequire(nuxtRequire.resolve("vue"))("@vue/server-renderer");

test("Nuxt renders UI slots through the same Vue runtime", async () => {
  const SlotProvider = uiVue.defineComponent({
    setup(_: unknown, { slots }: { slots: Record<string, unknown> }) {
      return () => uiVue.renderSlot(slots, "default");
    },
  });
  const app = nuxtVue.createSSRApp({
    render: () => nuxtVue.h(SlotProvider, null, {
      default: () => nuxtVue.h("p", "Invocation details"),
    }),
  });

  assert.match(await renderToString(app), /<p>Invocation details<\/p>/);
});
