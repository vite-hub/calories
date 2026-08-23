<script setup lang="ts">
defineProps<{
  calorieGoal: number;
  proteinGoal: number;
  settingsOpen: boolean;
}>();

defineEmits<{ settings: [] }>();
</script>

<template>
  <header class="app-header">
    <div class="brand-lockup">
      <span class="brand-symbol" aria-hidden="true"><UIcon name="i-lucide-flame" /></span>
      <div>
        <p>Calories</p>
        <span>Meal journal</span>
      </div>
    </div>

    <div class="header-actions">
      <button
        class="goal-summary"
        type="button"
        :aria-expanded="settingsOpen"
        aria-controls="goal-editor"
        @click="$emit('settings')"
      >
        <UIcon name="i-lucide-target" aria-hidden="true" />
        <span>Daily goals</span>
        <strong>{{ calorieGoal.toLocaleString() }} kcal · {{ proteinGoal }}g</strong>
      </button>

      <ClientOnly>
        <UColorModeButton class="theme-toggle" color="neutral" variant="ghost" />
        <template #fallback><span class="theme-toggle" aria-hidden="true" /></template>
      </ClientOnly>
    </div>
  </header>
</template>
