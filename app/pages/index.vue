<script setup lang="ts">
definePageMeta({
  scrollToTop: (to) => !to.query.meal,
});

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
const { goals, saveGoals } = useDailyGoals();
const journalNow = useNow({ scheduler: callback => useIntervalFn(callback, 60_000) });

function goalDelta(value: number, goal: number, unit: string): string {
  const difference = goal - value;
  return difference >= 0
    ? `${difference.toLocaleString()} ${unit} left`
    : `${Math.abs(difference).toLocaleString()} ${unit} over`;
}

function isRelativeDay(label: string): boolean {
  return label === "Today" || label === "Yesterday";
}

function dayMetrics(day: { calories: number; protein: number }) {
  return [
    { color: "primary", dot: "bg-primary", goal: goals.value.calories, label: "Calories", unit: "kcal", value: day.calories },
    { color: "secondary", dot: "bg-secondary", goal: goals.value.protein, label: "Protein", unit: "g", value: day.protein },
  ] as const;
}

const days = computed(() => groupMealsByDay(meals.value, journalNow.value.getTime()));
</script>

<template>
  <div class="min-h-dvh">
    <AppHeader :goals @save="saveGoals" />

    <main class="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <div class="pt-8 pb-6 sm:pt-10">
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">Meal journal</h1>
        <p class="mt-1 text-sm text-muted">Calories and protein from your saved meals.</p>

        <nav
          v-if="days.length"
          class="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          aria-label="Jump to a day"
        >
          <UButton
            v-for="day in days.slice(0, 7)"
            :key="day.key"
            class="shrink-0"
            color="neutral"
            exact-hash
            :aria-current="route.hash === `#day-${day.key}` ? 'location' : undefined"
            size="sm"
            :to="`#day-${day.key}`"
            variant="outline"
          >
            <template v-if="isRelativeDay(day.label)">{{ day.label }}</template>
            <NuxtTime v-else :datetime="day.date" day="numeric" month="short" weekday="short" />
          </UButton>
        </nav>
      </div>

      <UAlert
        v-if="loadError && !loading"
        class="mb-6"
        color="error"
        icon="i-lucide-circle-alert"
        title="Meals could not be loaded"
        description="The journal could not reach the server. Check the connection, then try again."
        variant="subtle"
        :actions="[{ label: 'Try again', color: 'error', variant: 'outline', onClick: () => refresh() }]"
      />

      <section
        v-for="day in days"
        :id="`day-${day.key}`"
        :key="day.key"
        class="scroll-mt-20 border-t border-default py-6"
        :aria-labelledby="`day-${day.key}-title`"
      >
        <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 :id="`day-${day.key}-title`" class="text-base font-semibold text-highlighted">
            <template v-if="isRelativeDay(day.label)">
              {{ day.label }}
              <NuxtTime class="ms-1 font-normal text-muted" :datetime="day.date" day="numeric" month="long" weekday="long" :year="day.year" />
            </template>
            <NuxtTime v-else :datetime="day.date" day="numeric" month="long" weekday="long" :year="day.year" />
          </h2>
          <p class="text-xs text-muted tabular-nums">{{ day.meals.length }} {{ day.meals.length === 1 ? "meal" : "meals" }}</p>
        </header>

        <UCard
          class="mt-3"
          variant="subtle"
          :ui="{ body: 'grid grid-cols-2 divide-x divide-default p-0 sm:p-0' }"
        >
          <div v-for="metric in dayMetrics(day)" :key="metric.label" class="min-w-0 p-4">
            <p class="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span class="size-2 rounded-full" :class="metric.dot" aria-hidden="true" />
              {{ metric.label }}
            </p>
            <p class="mt-1.5 tabular-nums">
              <span class="text-xl font-semibold tracking-tight text-highlighted">{{ metric.value.toLocaleString() }}</span>
              <span class="ms-1 text-xs text-muted">of {{ metric.goal.toLocaleString() }} {{ metric.unit }}</span>
            </p>
            <!-- The text around the bar states the same values for assistive technology. -->
            <UProgress
              aria-hidden="true"
              class="mt-3"
              :color="metric.value > metric.goal ? 'warning' : metric.color"
              :max="metric.goal"
              :model-value="Math.min(metric.value, metric.goal)"
              size="sm"
            />
            <p
              class="mt-2 text-xs tabular-nums"
              :class="metric.value > metric.goal ? 'font-medium text-highlighted' : 'text-muted'"
            >
              {{ goalDelta(metric.value, metric.goal, metric.unit) }}
            </p>
          </div>
        </UCard>

        <div class="mt-3 grid gap-3">
          <MealAnalysis
            v-for="meal in day.meals"
            :id="`meal-${meal.id}`"
            :key="meal.id"
            :meal
            :selected="meal.id === selectedMealId"
          />
        </div>
      </section>

      <div v-if="loading && !meals.length" role="status" class="grid gap-3 border-t border-default py-6">
        <span class="sr-only">Loading meals</span>
        <USkeleton class="h-5 w-48 motion-reduce:animate-none" />
        <USkeleton class="h-32 w-full rounded-lg motion-reduce:animate-none" />
        <USkeleton class="h-28 w-full rounded-lg motion-reduce:animate-none" />
      </div>
      <p v-else-if="loading" role="status" class="py-6 text-center text-xs text-muted">Loading more meals…</p>

      <UEmpty
        v-if="!loading && !loadError && !meals.length"
        icon="i-lucide-utensils"
        title="No meals yet"
        description="Send a meal as text, a photo, or a voice note to your private chat. It appears here after it is saved."
        variant="outline"
      />
    </main>
  </div>
</template>
