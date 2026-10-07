<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import type { DailyGoals } from "~/utils/goals";

const props = defineProps<{ goals: DailyGoals }>();
const emit = defineEmits<{ cancel: []; save: [goals: DailyGoals] }>();
const draft = reactive({ ...props.goals });

function submit(event: FormSubmitEvent<DailyGoals>) {
  emit("save", event.data);
}
</script>

<template>
  <UForm
    id="goal-editor"
    class="grid gap-3"
    aria-label="Daily goals"
    :schema="dailyGoalsSchema"
    :state="draft"
    @submit="submit"
  >
    <div class="grid grid-cols-2 gap-3">
      <UFormField label="Calories" name="calories" required>
        <UInput
          v-model.number="draft.calories"
          autofocus
          class="w-full"
          inputmode="numeric"
          :min="1"
          :step="1"
          type="number"
          :ui="{ trailing: 'pointer-events-none' }"
        >
          <template #trailing><span class="text-xs text-dimmed">kcal</span></template>
        </UInput>
      </UFormField>
      <UFormField label="Protein (g)" name="protein" required>
        <UInput
          v-model.number="draft.protein"
          class="w-full"
          inputmode="numeric"
          :min="1"
          :step="1"
          type="number"
          :ui="{ trailing: 'pointer-events-none' }"
        >
          <template #trailing><span class="text-xs text-dimmed">g</span></template>
        </UInput>
      </UFormField>
    </div>

    <div class="flex justify-end gap-2">
      <UButton color="neutral" size="sm" variant="ghost" @click="emit('cancel')">Cancel</UButton>
      <UButton color="neutral" size="sm" type="submit">Save goals</UButton>
    </div>
  </UForm>
</template>
