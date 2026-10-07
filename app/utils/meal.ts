import type { CollectionClientItem } from "vite-hub/source";

export type Meal = CollectionClientItem<ViteHubCollectionMap["meals"]>;

export function getMealTitle(meal: Meal): string {
  return (
    meal.items
      .map((item) => item.name)
      .slice(0, 2)
      .join(" + ") ||
    meal.caption ||
    "Meal"
  );
}

export function parseUsageCostUsd(value?: string | null): number | undefined {
  const match = value?.replaceAll(",", "").match(/\$(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const cost = Number(match[1]);
  return Number.isFinite(cost) ? cost : undefined;
}

export function formatUsageCostUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value > 0 && value < 0.01 ? 6 : 2,
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    style: "currency",
  }).format(value);
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string, now: number): string {
  const date = new Date(value);
  const today = new Date(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return "Today";
  if (dayKey(value) === dayKey(yesterday.toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function groupMealsByDay(meals: readonly Meal[], now: number) {
  const groups = new Map<
    string,
    {
      calories: number;
      cost: number;
      date: string;
      hasCost: boolean;
      meals: Meal[];
      protein: number;
    }
  >();
  for (const meal of meals) {
    const key = dayKey(meal.createdAt);
    const day = groups.get(key) ?? {
      calories: 0,
      cost: 0,
      date: meal.createdAt,
      hasCost: false,
      meals: [],
      protein: 0,
    };
    const cost = parseUsageCostUsd(meal.usageCost);
    day.meals.push(meal);
    day.calories += meal.totalCalories ?? 0;
    day.protein += meal.totalProtein ?? meal.items.reduce((sum, item) => sum + (item.protein ?? 0), 0);
    if (cost !== undefined) {
      day.cost += cost;
      day.hasCost = true;
    }
    groups.set(key, day);
  }
  return [...groups.entries()].map(([key, day]) => ({
    ...day,
    cost: day.hasCost ? day.cost : undefined,
    key,
    label: dayLabel(day.date, now),
    year: new Date(day.date).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric" as const,
  }));
}
