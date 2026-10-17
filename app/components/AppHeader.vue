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
  <header class="sticky top-0 z-10 h-(--ui-header-height) bg-(--cobalt) text-(--paper) shadow-[0_4px_0_var(--ink)]">
    <div class="mx-auto flex h-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2.5 rounded-md font-display text-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--yolk)">
        <span class="size-4 rounded-full bg-(--yolk) shadow-[0_3px_0_var(--ink)]" aria-hidden="true" />
        Calories
      </NuxtLink>

      <div class="flex items-center gap-1.5">
        <!-- Unmount the draft immediately, including during the popover's close transition. -->
        <UPopover v-model:open="goalsOpen" :content="{ align: 'end', sideOffset: 6 }">
          <UButton
            color="neutral"
            icon="i-lucide-target"
            size="sm"
            variant="solid"
            class="rounded-lg bg-(--paper) font-semibold text-(--ink) tabular-nums shadow-[0_3px_0_var(--ink)] hover:bg-white active:translate-y-0.5 active:shadow-[0_1px_0_var(--ink)]"
          >
            <span class="sr-only">Daily goals:</span>
            {{ goals.calories.toLocaleString() }} kcal
            <span class="opacity-50" aria-hidden="true">/</span>
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
          <UColorModeButton color="neutral" size="sm" variant="ghost" class="text-(--paper) hover:bg-white/15 hover:text-(--paper)" />
          <template #fallback><span class="size-8" aria-hidden="true" /></template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>
