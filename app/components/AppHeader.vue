<script setup lang="ts">
import type { DailyGoals } from "~/utils/goals";

defineProps<{ goals: DailyGoals }>();
const emit = defineEmits<{ save: [goals: DailyGoals] }>();
const goalsOpen = shallowRef(false);

function save(value: DailyGoals) {
  emit("save", value);
  goalsOpen.value = false;
}
</script>

<template>
  <header class="sticky top-0 z-10 h-(--ui-header-height) border-b border-default bg-default">
    <div class="mx-auto flex h-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
      <div class="flex items-center gap-2">
        <span class="grid size-7 place-items-center rounded-md bg-inverted text-inverted" aria-hidden="true">
          <UIcon name="i-lucide-flame" class="size-4" />
        </span>
        <span class="text-sm font-semibold text-highlighted">Calories</span>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Unmount the draft immediately, including during the popover's close transition. -->
        <UPopover v-model:open="goalsOpen" :content="{ align: 'end', sideOffset: 6 }">
          <UButton
            color="neutral"
            icon="i-lucide-target"
            size="sm"
            variant="outline"
            class="tabular-nums"
          >
            <span class="sr-only">Daily goals:</span>
            {{ goals.calories.toLocaleString() }} kcal
            <span class="text-dimmed" aria-hidden="true">/</span>
            {{ goals.protein }} g<span class="sr-only"> protein</span>
          </UButton>

          <template #content="{ close }">
            <div class="w-72 p-4">
              <h2 class="text-sm font-semibold text-highlighted">Daily goals</h2>
              <p class="mt-1 text-xs text-muted">Each day's progress is measured against these targets.</p>
              <GoalEditor v-if="goalsOpen" class="mt-4" :goals @cancel="close" @save="save" />
            </div>
          </template>
        </UPopover>

        <ClientOnly>
          <UColorModeButton color="neutral" size="sm" variant="ghost" />
          <template #fallback><span class="size-8" aria-hidden="true" /></template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
