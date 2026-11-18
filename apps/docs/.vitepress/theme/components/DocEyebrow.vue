<script setup lang="ts">
import { useData, useRoute } from 'vitepress';
import { computed } from 'vue';

/** The section a page belongs to, shown above its title: "Guide", "Protocol" and so on. */
interface Group {
  text?: string;
  items?: { link?: string }[];
}

const { theme } = useData();
const route = useRoute();

const section = computed(() => {
  const path = route.path.replace(/(\.html|\/)$/, '');
  const groups = (theme.value.sidebar ?? []) as Group[];
  return groups.find((group) => group.items?.some((item) => item.link === path))?.text;
});
</script>

<template>
  <p v-if="section" class="eyebrow">{{ section }}</p>
</template>

<style scoped>
.eyebrow {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 0.9rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.eyebrow::before {
  content: '';
  width: 1.4rem;
  height: 1px;
  background: currentColor;
}
</style>
