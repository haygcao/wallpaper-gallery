<script setup>
/**
 * WallpaperGrid 入口文件
 * 转发到模块化后的组件
 */
import WallpaperGridNew from './WallpaperGrid/index.vue'

defineProps({
  wallpapers: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  hasFilters: {
    type: Boolean,
    default: false,
  },
  popularityData: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select', 'resetFilters'])
</script>

<template>
  <WallpaperGridNew
    :wallpapers="wallpapers"
    :loading="loading"
    :search-query="searchQuery"
    :total-count="totalCount"
    :has-filters="hasFilters"
    :popularity-data="popularityData"
    @select="$emit('select', $event)"
    @reset-filters="$emit('resetFilters')"
  />
</template>
