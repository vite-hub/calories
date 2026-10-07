<script setup lang="ts">
import type { Meal } from "../utils/meal";

const props = defineProps<{ meal: Meal; selected?: boolean }>();
const usageCost = computed(() => parseUsageCostUsd(props.meal.usageCost));
const header = useTemplateRef("header");

const confidenceLabels: Record<NonNullable<Meal["confidence"]>, string> = {
  "high": "High confidence",
  "low": "Low confidence",
  "medium": "Medium confidence",
  "user-stated": "User-stated amounts",
};

watchPostEffect(async () => {
  const element = header.value;
  if (!props.selected || !element) return;
  await nextTick();
  if (props.selected && header.value === element) {
    element.scrollIntoView({ behavior: "instant", block: "center" });
  }
});
</script>

<template>
  <UCard
    as="article"
    class="scroll-mt-20"
    :class="{ 'ring-2 ring-inverted': selected }"
    :aria-current="selected ? 'true' : undefined"
    :ui="{ header: 'px-4 py-3 sm:px-5', body: 'px-4 py-1 sm:px-5 sm:py-1', footer: 'px-4 py-2.5 sm:px-5' }"
  >
    <template #header>
      <div ref="header" class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <NuxtTime class="text-xs text-muted tabular-nums" :datetime="meal.createdAt" hour="numeric" minute="2-digit" />
          <h3 class="mt-0.5 text-sm font-semibold text-highlighted wrap-anywhere">{{ getMealTitle(meal) }}</h3>
        </div>

        <dl class="shrink-0 text-right tabular-nums">
          <dt class="sr-only">Calories</dt>
          <dd class="text-sm font-semibold text-highlighted">
            {{ meal.totalCalories?.toLocaleString() ?? "–" }}
            <span class="text-xs font-normal text-muted">kcal</span>
          </dd>
          <dt class="sr-only">Protein</dt>
          <dd class="text-xs text-muted">{{ meal.totalProtein ?? "–" }} g protein</dd>
        </dl>
      </div>
    </template>

    <table v-if="meal.items.length" class="w-full text-sm">
      <caption class="sr-only">Items in {{ getMealTitle(meal) }}</caption>
      <thead class="sr-only">
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Calories</th>
          <th scope="col">Protein</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <tr v-for="(item, index) in meal.items" :key="`${index}-${item.name}`" class="align-top">
          <th scope="row" class="py-2.5 pe-3 text-left font-normal">
            <span class="block text-default wrap-anywhere">{{ item.name }}</span>
            <span class="block text-xs text-muted wrap-anywhere">{{ item.portion }}</span>
          </th>
          <td class="py-2.5 ps-3 text-right whitespace-nowrap text-default tabular-nums">{{ item.calories }} kcal</td>
          <td class="w-14 py-2.5 ps-3 text-right whitespace-nowrap text-muted tabular-nums">{{ item.protein ?? "–" }} g</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="py-2.5 text-xs text-muted">No item breakdown was saved for this meal.</p>

    <template v-if="meal.confidence || usageCost !== undefined" #footer>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <UBadge
          v-if="meal.confidence"
          :color="meal.confidence === 'low' ? 'warning' : 'neutral'"
          size="sm"
          variant="subtle"
        >
          {{ confidenceLabels[meal.confidence] }}
        </UBadge>
        <span v-if="usageCost !== undefined" class="ms-auto tabular-nums">AI cost {{ formatUsageCostUsd(usageCost) }}</span>
      </div>
    </template>
  </UCard>
</template>
