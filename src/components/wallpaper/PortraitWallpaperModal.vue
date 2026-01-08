<script setup>
/**
 * 竖屏壁纸弹窗入口文件
 * 转发到重构后的组件
 */
import PortraitWallpaperModalNew from './PortraitWallpaperModal/index.vue'

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

defineEmits(['close'])
</script>

<template>
  <PortraitWallpaperModalNew
    :wallpaper="wallpaper"
    :is-open="isOpen"
    @close="$emit('close')"
  />
</template>
