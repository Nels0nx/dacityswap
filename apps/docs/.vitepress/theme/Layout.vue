<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import DocEyebrow from './components/DocEyebrow.vue';
import SiteFooter from './components/SiteFooter.vue';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #nav-bar-title-after>
      <span class="docs-tag">Docs</span>
    </template>
    <template #doc-before>
      <DocEyebrow />
    </template>
    <template #layout-bottom>
      <SiteFooter />
    </template>
  </Layout>
</template>
