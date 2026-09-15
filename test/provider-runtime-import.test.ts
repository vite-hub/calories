import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("provider runtime imports without requiring process or buffer at Worker startup", () => {
  execFileSync(process.execPath, [
    "--input-type=module",
    "-e",
    `import { createRequire, findPackageJSON, registerHooks } from "node:module";
    import { pathToFileURL } from "node:url";
    const require = createRequire(import.meta.url);
    const agent = createRequire(require.resolve("vite-hub/package.json"))
      .resolve("@vite-hub/agent/package.json");
    const runtime = new URL("./dist/index.mjs", pathToFileURL(
      findPackageJSON("@t3tools/provider-runtime", pathToFileURL(agent)),
    ));
    // Workerd accepts the ESM imports but cannot resolve these createRequire calls.
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (context.conditions.includes("require") &&
            /^(node:)?(process|buffer)$/.test(specifier)) {
          throw new Error('No such module "' + specifier + '"');
        }
        return nextResolve(specifier, context);
      },
    });
    await import(runtime.href);`,
  ], { cwd: process.cwd(), stdio: "pipe" });
});
