<script setup>
/**
 * WallpaperModal 入口文件
 * 转发到模块化后的组件
 */
import WallpaperModalNew from './WallpaperModal/index.vue'

defineProps({
  wallpaper: {
    type: Object,
    default: null,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['close', 'prev', 'next'])
</script>

<template>
  <WallpaperModalNew
    :wallpaper="wallpaper"
    :is-open="isOpen"
    @close="$emit('close')"
    @prev="$emit('prev')"
    @next="$emit('next')"
  />
</template>
