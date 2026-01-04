<script setup>
import { onMounted } from 'vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

import { useTheme } from '@/composables/useTheme'

// Theme
const { initTheme } = useTheme()

// Initialize
onMounted(() => {
  initTheme()
  // 触发预渲染完成事件（用于 vite-plugin-prerender）
  document.dispatchEvent(new Event('render-event'))
})
</script>

<template>
  <div class="app">
    <AppHeader />

    <main class="main-content">
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>

<style lang="scss">
@use '@/assets/styles/main.scss';
</style>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding-top: $header-height;
}
</style>
