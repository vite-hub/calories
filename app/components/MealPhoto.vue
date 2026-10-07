<script setup lang="ts">
const props = defineProps<{ src: string; title: string }>();

const failed = ref(false);
const size = ref<{ height: number; width: number }>();

function onLoad(event: Event) {
  const image = event.currentTarget;
  if (!(image instanceof HTMLImageElement)) return;
  size.value = { height: image.naturalHeight, width: image.naturalWidth };
}

watch(() => props.src, () => {
  failed.value = false;
  size.value = undefined;
});
</script>

<template>
  <div
    v-if="failed"
    role="img"
    :aria-label="`Photo of ${title} is unavailable`"
    class="flex aspect-[2/1] w-full items-center justify-center gap-2 rounded-md bg-elevated text-xs text-muted sm:aspect-[3/1]"
  >
    <UIcon name="i-lucide-image-off" class="size-4" />
    Photo unavailable
  </div>

  <UModal v-else :title :ui="{ content: 'sm:max-w-3xl', body: 'p-2 sm:p-3' }">
    <UButton
      color="neutral"
      variant="ghost"
      class="block w-full overflow-hidden p-0"
      :aria-label="`Open photo of ${title}`"
    >
      <img
        :src
        :alt="`Photo of ${title}`"
        loading="lazy"
        decoding="async"
        class="aspect-[2/1] w-full bg-elevated object-cover sm:aspect-[3/1]"
        @load="onLoad"
        @error="failed = true"
      >
    </UButton>

    <template #body>
      <img
        :src
        :alt="`Photo of ${title}`"
        :width="size?.width"
        :height="size?.height"
        decoding="async"
        class="mx-auto max-h-[calc(100dvh-10rem)] w-auto rounded-md object-contain"
        @error="failed = true"
      >
    </template>
  </UModal>
</template>
