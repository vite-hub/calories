<script setup lang="ts">
import { getMealTitle, type Meal } from "../utils/meal";

const props = defineProps<{ meal: Meal }>();
const failed = ref(false);
const source = computed(() => (failed.value ? undefined : props.meal.photoUrl));
const fallback = computed(() => getMealTitle(props.meal).trim().charAt(0).toUpperCase() || "M");

watch(() => props.meal.photoUrl, () => {
  failed.value = false;
});
</script>

<template>
  <img v-if="source" :src="source" alt="" loading="lazy" @error="failed = true" />
  <span v-else class="meal-photo-fallback" aria-hidden="true">{{ fallback }}</span>
</template>
