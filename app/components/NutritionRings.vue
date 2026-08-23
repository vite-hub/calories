<script setup lang="ts">
const props = defineProps<{
  calorieGoal: number;
  calories: number;
  protein: number;
  proteinGoal: number;
}>();

const outerRadius = 62;
const innerRadius = 43;
const circumference = (radius: number) => 2 * Math.PI * radius;
const progress = (value: number, goal: number) => Math.min(value / Math.max(goal, 1), 1);
const overflow = (value: number, goal: number) => Math.min(Math.max(value / Math.max(goal, 1) - 1, 0), 1);
const dashOffset = (radius: number, value: number) => circumference(radius) * (1 - value);
</script>

<template>
  <figure
    class="nutrition-rings"
    :aria-label="`${calories} of ${calorieGoal} calories and ${protein} of ${proteinGoal} grams of protein`"
  >
    <svg viewBox="0 0 160 160" role="img" aria-hidden="true">
      <g transform="rotate(-90 80 80)">
        <g class="ring-layer calories-ring">
          <circle class="ring-track" cx="80" cy="80" :r="outerRadius" />
          <circle
            class="ring-progress"
            cx="80"
            cy="80"
            :r="outerRadius"
            :stroke-dasharray="circumference(outerRadius)"
            :stroke-dashoffset="dashOffset(outerRadius, progress(calories, calorieGoal))"
          />
          <circle
            v-if="calories > calorieGoal"
            class="ring-overflow"
            cx="80"
            cy="80"
            r="71"
            :stroke-dasharray="circumference(71)"
            :stroke-dashoffset="dashOffset(71, overflow(calories, calorieGoal))"
          />
        </g>

        <g class="ring-layer protein-ring">
          <circle class="ring-track" cx="80" cy="80" :r="innerRadius" />
          <circle
            class="ring-progress"
            cx="80"
            cy="80"
            :r="innerRadius"
            :stroke-dasharray="circumference(innerRadius)"
            :stroke-dashoffset="dashOffset(innerRadius, progress(protein, proteinGoal))"
          />
          <circle
            v-if="protein > proteinGoal"
            class="ring-overflow"
            cx="80"
            cy="80"
            r="51"
            :stroke-dasharray="circumference(51)"
            :stroke-dashoffset="dashOffset(51, overflow(protein, proteinGoal))"
          />
        </g>
      </g>

      <text class="ring-calorie-value" x="80" y="72">{{ calories.toLocaleString() }}</text>
      <text class="ring-unit-label" x="80" y="88">kcal</text>
      <text class="ring-protein-value" x="80" y="110">{{ protein }}g protein</text>
    </svg>
  </figure>
</template>
