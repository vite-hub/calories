import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const copiedWorkflowComponents = [
  "app/components/MealAnalysis.vue",
  "app/components/MealPhoto.vue",
];

test("components copied into a Workflow keep their local utility imports resolvable", async () => {
  for (const componentPath of copiedWorkflowComponents) {
    const absolutePath = resolve(projectRoot, componentPath);
    const source = await readFile(absolutePath, "utf8");
    const importMatch = source.match(/from ["']([^"']*utils\/meal)["']/);

    assert.ok(importMatch, `${componentPath} imports the meal utility`);
    assert.equal(
      importMatch[1],
      "../utils/meal",
      `${componentPath} must resolve the utility relative to its copied Workflow location`,
    );
    await access(resolve(dirname(absolutePath), `${importMatch[1]}.ts`));
  }
});
