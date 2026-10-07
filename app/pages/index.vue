<script setup lang="ts">
import type { Meal } from "~/utils/meal";

const route = useRoute();
const selectedMealId = computed(() => Array.isArray(route.query.meal)
  ? route.query.meal[0]
  : route.query.meal ?? undefined);
const {
  error: loadError,
  items: meals,
  pending: loading,
  refresh,
} = useCollection("meals", {
  all: true,
  limit: 50,
});
const settingsOpen = ref(false);
const savedGoals = useCookie<{ calories: number; protein: number } | null>("calories-goals", {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
});
const calorieGoal = useState("calorie-goal", () => Number(savedGoals.value?.calories) || 2_000);
const proteinGoal = useState("protein-goal", () => Number(savedGoals.value?.protein) || 150);
const journalNow = useState("journal-now", () => Date.now());

function goalDelta(value: number, goal: number, unit: string): string {
  const difference = goal - value;
  return difference >= 0
    ? `${difference.toLocaleString()} ${unit} left`
    : `${Math.abs(difference).toLocaleString()} ${unit} over`;
}

const days = computed(() => groupMealsByDay(meals.value, journalNow.value));

function saveGoals() {
  calorieGoal.value = Math.max(1, Math.round(Number(calorieGoal.value) || 2_000));
  proteinGoal.value = Math.max(1, Math.round(Number(proteinGoal.value) || 150));
  savedGoals.value = { calories: calorieGoal.value, protein: proteinGoal.value };
  settingsOpen.value = false;
}

watch([meals, selectedMealId], async ([loadedMeals, mealId]) => {
  if (!mealId || !loadedMeals.some((meal: Meal) => meal.id === mealId)) return;
  await nextTick();
  document.getElementById(`meal-${mealId}`)?.scrollIntoView({ block: "center" });
}, { immediate: true, flush: "post" });

onMounted(() => {
  journalNow.value = Date.now();
  if (savedGoals.value) return;
  // Migrate goals saved before the dashboard used Nuxt cookies.
  try {
    const goals = JSON.parse(localStorage.getItem("calories-goals") || "null");
    if (Number.isFinite(goals?.calories) && goals.calories > 0) calorieGoal.value = goals.calories;
    if (Number.isFinite(goals?.protein) && goals.protein > 0) proteinGoal.value = goals.protein;
    saveGoals();
  } catch {}
});
</script>

<template>
  <main class="calories-app">
    <AppHeader
      :calorie-goal
      :protein-goal
      :settings-open
      @settings="settingsOpen = !settingsOpen"
    />

    <form
      v-if="settingsOpen"
      id="goal-editor"
      class="goal-editor"
      aria-label="Daily goals"
      @submit.prevent="saveGoals"
    >
      <UFormField label="Calories" name="calories">
        <UInput
          id="calorie-goal"
          v-model.number="calorieGoal"
          inputmode="numeric"
          min="50"
          step="50"
          type="number"
        />
      </UFormField>
      <UFormField label="Protein (g)" name="protein">
        <UInput
          id="protein-goal"
          v-model.number="proteinGoal"
          inputmode="numeric"
          min="5"
          step="5"
          type="number"
        />
      </UFormField>
      <UButton class="goal-save" color="neutral" type="submit">Save</UButton>
    </form>

    <div class="dashboard-content">
      <section class="dashboard-heading" aria-labelledby="dashboard-title">
        <div>
          <span class="dashboard-eyebrow">Nutrition overview</span>
          <h1 id="dashboard-title">Meal history</h1>
          <p>Calories and protein from your saved meals.</p>
        </div>

        <nav v-if="days.length" class="date-nav" aria-label="Jump to a day">
          <NuxtLink
            v-for="day in days.slice(0, 7)"
            :key="day.key"
            :to="`#day-${day.key}`"
            :class="{ 'is-current': day.label === 'Today' }"
          >
            <span>{{ day.label }}</span>
            <strong><NuxtTime :datetime="day.date" day="numeric" month="short" /></strong>
          </NuxtLink>
        </nav>
      </section>

      <div class="daily-log">
        <section
          v-for="day in days"
          :id="`day-${day.key}`"
          :key="day.key"
          class="day-section"
        >
          <header class="day-heading">
            <div>
              <span>{{ day.label }}</span>
              <h2><NuxtTime :datetime="day.date" day="numeric" month="long" weekday="long" :year="day.year" /></h2>
            </div>
            <div class="day-heading-meta">
              <span v-if="day.cost !== undefined">AI · {{ formatUsageCostUsd(day.cost) }}</span>
              <UBadge color="neutral" size="sm" variant="soft">
                {{ day.meals.length }} {{ day.meals.length === 1 ? "meal" : "meals" }}
              </UBadge>
            </div>
          </header>

          <div class="day-layout">
            <UCard
              as="aside"
              class="day-summary-card"
              variant="outline"
              :ui="{ body: 'p-0 sm:p-0' }"
            >
              <div class="day-progress">
                <NutritionRings
                  :calorie-goal
                  :calories="day.calories"
                  :protein="day.protein"
                  :protein-goal
                />

                <dl class="day-metrics tabular-nums">
                  <div>
                    <dt><i class="calorie-dot" />Calories</dt>
                    <dd>
                      <strong>{{ day.calories.toLocaleString() }}</strong>
                      <span>of {{ calorieGoal.toLocaleString() }} kcal</span>
                    </dd>
                    <small>{{ goalDelta(day.calories, calorieGoal, "kcal") }}</small>
                  </div>
                  <div>
                    <dt><i class="protein-dot" />Protein</dt>
                    <dd>
                      <strong>{{ day.protein }}</strong>
                      <span>of {{ proteinGoal }} g</span>
                    </dd>
                    <small>{{ goalDelta(day.protein, proteinGoal, "g") }}</small>
                  </div>
                </dl>
              </div>
            </UCard>

            <div class="meal-list">
              <MealAnalysis
                v-for="meal in day.meals"
                :id="`meal-${meal.id}`"
                :key="meal.id"
                :class="{ 'is-selected': meal.id === selectedMealId }"
                :meal
              />
            </div>
          </div>
        </section>

        <UEmpty v-if="!loading && !loadError && !meals.length" icon="i-lucide-utensils" title="No meals yet" description="Send a meal to your configured private chat to start your journal." />

        <div v-if="loading || loadError" class="feed-sentinel" aria-live="polite">
          <span v-if="loading">Loading meals…</span>
          <UButton v-else color="error" variant="soft" @click="refresh">
            Try again
          </UButton>
        </div>
      </div>
    </div>
  </main>
</template>
