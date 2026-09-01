<script setup lang="ts">
import {
  formatUsageCostUsd,
  parseUsageCostUsd,
  type Meal,
} from "~/utils/meal";
import { useCollection } from "vite-hub/source/client";

const route = useRoute();
const selectedMealId = typeof route.query.meal === "string" ? route.query.meal : undefined;
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
const calorieGoal = ref(2_000);
const proteinGoal = ref(150);

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
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

function dayDateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(new Date(value));
}

function dayNavLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}

function goalDelta(value: number, goal: number, unit: string): string {
  const difference = goal - value;
  return difference >= 0
    ? `${difference.toLocaleString()} ${unit} left`
    : `${Math.abs(difference).toLocaleString()} ${unit} over`;
}

const days = computed(() => {
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
  for (const meal of meals.value) {
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
    label: dayLabel(day.date),
  }));
});

function saveGoals() {
  calorieGoal.value = Math.max(1, Math.round(Number(calorieGoal.value) || 2_000));
  proteinGoal.value = Math.max(1, Math.round(Number(proteinGoal.value) || 150));
  localStorage.setItem(
    "calories-goals",
    JSON.stringify({ calories: calorieGoal.value, protein: proteinGoal.value }),
  );
  settingsOpen.value = false;
}

watch(meals, async (loadedMeals: Meal[]) => {
  if (!selectedMealId) return;
  const selectedMeal = loadedMeals.find((meal: Meal) => meal.id === selectedMealId);
  if (!selectedMeal) return;

  await nextTick();
  document.getElementById(`meal-${selectedMealId}`)?.scrollIntoView({ block: "center" });
}, { immediate: true });

onMounted(() => {
  // ponytail: goals stay device-local until the dashboard has authentication.
  try {
    const goals = JSON.parse(localStorage.getItem("calories-goals") || "null");
    if (Number.isFinite(goals?.calories) && goals.calories > 0) calorieGoal.value = goals.calories;
    if (Number.isFinite(goals?.protein) && goals.protein > 0) proteinGoal.value = goals.protein;
  } catch {}
});
</script>

<template>
  <main class="calories-app">
    <AppHeader
      :calorie-goal="calorieGoal"
      :protein-goal="proteinGoal"
      :settings-open="settingsOpen"
      @settings="settingsOpen = !settingsOpen"
    />

    <form
      v-if="settingsOpen"
      id="goal-editor"
      class="goal-editor"
      aria-label="Daily goals"
      @submit.prevent="saveGoals"
    >
      <div>
        <label for="calorie-goal">Calories</label>
        <input
          id="calorie-goal"
          v-model.number="calorieGoal"
          inputmode="numeric"
          min="50"
          step="50"
          type="number"
        />
      </div>
      <div>
        <label for="protein-goal">Protein (g)</label>
        <input
          id="protein-goal"
          v-model.number="proteinGoal"
          inputmode="numeric"
          min="5"
          step="5"
          type="number"
        />
      </div>
      <button class="goal-save" type="submit">Save</button>
    </form>

    <div class="dashboard-content">
      <section class="dashboard-heading" aria-labelledby="dashboard-title">
        <div>
          <span class="dashboard-eyebrow">Nutrition overview</span>
          <h1 id="dashboard-title">Meal history</h1>
          <p>Calories and protein from your saved meals.</p>
        </div>

        <nav v-if="days.length" class="date-nav" aria-label="Jump to a day">
          <a
            v-for="day in days.slice(0, 7)"
            :key="day.key"
            :href="`#day-${day.key}`"
            :class="{ 'is-current': day.label === 'Today' }"
          >
            <span>{{ day.label }}</span>
            <strong>{{ dayNavLabel(day.date) }}</strong>
          </a>
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
              <h2>{{ dayDateLabel(day.date) }}</h2>
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
                  :calorie-goal="calorieGoal"
                  :calories="day.calories"
                  :protein="day.protein"
                  :protein-goal="proteinGoal"
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
                :meal="meal"
              />
            </div>
          </div>
        </section>

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
