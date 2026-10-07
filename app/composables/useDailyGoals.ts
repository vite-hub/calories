import type { DailyGoals } from "~/utils/goals";

export function useDailyGoals() {
  const savedGoals = useCookie<unknown>("calories-goals", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const goals = computed(() => dailyGoalsSchema.safeParse(savedGoals.value).data ?? defaultDailyGoals);

  onMounted(() => {
    if (savedGoals.value !== null) return;
    // Keep preferences saved before the dashboard switched to Nuxt cookies.
    try {
      const legacy = dailyGoalsSchema.safeParse(JSON.parse(localStorage.getItem("calories-goals") || "null"));
      if (legacy.success) savedGoals.value = legacy.data;
    } catch {
      // Defaults still work when browser storage is unavailable or malformed.
    }
  });

  function saveGoals(value: DailyGoals) {
    savedGoals.value = dailyGoalsSchema.parse(value);
  }

  return { goals, saveGoals };
}
