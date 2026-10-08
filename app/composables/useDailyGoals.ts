import type { DailyGoals } from "~/utils/goals";

export function useDailyGoals() {
  const savedGoals = useCookie<unknown>("calories-goals", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const goals = computed(() => dailyGoalsSchema.safeParse(savedGoals.value).data ?? defaultDailyGoals);

  function saveGoals(value: DailyGoals) {
    savedGoals.value = dailyGoalsSchema.parse(value);
  }

  return { goals, saveGoals };
}
