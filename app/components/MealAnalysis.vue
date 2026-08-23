<script setup lang="ts">
import {
  formatMealTime,
  formatUsageCostUsd,
  getMealTitle,
  parseUsageCostUsd,
  type Meal,
} from "~/utils/meal";

const props = defineProps<{ meal: Meal }>();
const usageCost = computed(() => parseUsageCostUsd(props.meal.usageCost));
</script>

<template>
  <UCard
    as="article"
    class="meal-entry"
    variant="outline"
    :ui="{
      body: 'p-0 sm:p-0',
      footer: 'p-0 sm:px-0',
      header: 'p-0 sm:px-0',
    }"
  >
    <template #header>
      <div class="meal-card-header">
        <span class="meal-photo"><MealPhoto :meal="meal" /></span>

        <div class="meal-heading">
          <div class="meal-meta">
            <span class="meal-time">{{ formatMealTime(meal.createdAt) }}</span>
            <UBadge
              v-if="meal.confidence"
              class="confidence-badge"
              color="neutral"
              size="sm"
              variant="soft"
            >
              {{ meal.confidence }} confidence
            </UBadge>
          </div>

          <h3>{{ getMealTitle(meal) }}</h3>

          <dl class="meal-macros tabular-nums">
            <div>
              <dt>Calories</dt>
              <dd>{{ meal.totalCalories?.toLocaleString() ?? "—" }} <small>kcal</small></dd>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>{{ meal.totalProtein ?? "—" }} <small>g</small></dd>
            </div>
          </dl>
        </div>
      </div>
    </template>

    <div class="food-list">
      <div v-for="item in meal.items" :key="`${item.name}-${item.portion}`" class="food-row">
        <div class="food-copy">
          <strong>{{ item.name }}</strong>
          <span>{{ item.portion }}</span>
        </div>
        <div class="food-macros tabular-nums">
          <span>{{ item.calories }} kcal</span>
          <span>{{ item.protein ?? "—" }} g protein</span>
        </div>
      </div>
    </div>

    <template v-if="usageCost !== undefined" #footer>
      <div class="meal-card-footer">
        <UIcon name="i-lucide-sparkles" aria-hidden="true" />
        AI estimate · {{ formatUsageCostUsd(usageCost) }}
      </div>
    </template>
  </UCard>
</template>
