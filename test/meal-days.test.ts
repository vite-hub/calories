import assert from "node:assert/strict";
import test from "node:test";

import { groupMealsByDay, type Meal } from "../app/utils/meal.ts";

function meal(id: string, createdAt: string, values: Partial<Meal> = {}): Meal {
  return {
    caption: null,
    confidence: null,
    createdAt,
    id,
    items: [],
    totalCalories: null,
    totalProtein: null,
    usageCost: null,
    ...values,
  };
}

test("daily totals use persisted meal totals and combine only available costs", () => {
  const now = new Date("2026-10-07T12:00:00Z").getTime();
  const days = groupMealsByDay([
    meal("lunch", "2026-10-07T11:00:00Z", {
      items: [{ calories: 999, name: "Lunch", portion: "1 plate", protein: 999 }],
      totalCalories: 600,
      totalProtein: 40,
      usageCost: "$0.012",
    }),
    meal("breakfast", "2026-10-07T09:00:00Z", {
      totalCalories: 300,
      totalProtein: 20,
      usageCost: "Cost unavailable",
    }),
    meal("dinner", "2026-10-06T19:00:00Z", { totalCalories: 700, totalProtein: 50 }),
  ], now);

  assert.deepEqual(days.map(({ label, calories, protein, cost }) => ({ label, calories, protein, cost })), [
    { label: "Today", calories: 900, protein: 60, cost: 0.012 },
    { label: "Yesterday", calories: 700, protein: 50, cost: undefined },
  ]);
});

test("older meals retain item protein when the persisted total is absent", () => {
  const days = groupMealsByDay([
    meal("legacy", "2026-10-07T09:00:00Z", {
      items: [{ calories: 200, name: "Yogurt", portion: "200 g", protein: 15 }],
      totalCalories: 200,
    }),
  ], new Date("2026-10-07T12:00:00Z").getTime());
  assert.equal(days[0]?.protein, 15);
});
