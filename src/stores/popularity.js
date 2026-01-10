// ========================================
// 热门数据管理 Store
// ========================================

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getPopularByTimeRange, getPopularWallpapers, isSupabaseConfigured } from '@/utils/supabase'

export const usePopularityStore = defineStore('popularity', () => {
  // ========================================
  // State
  // ========================================

  // 全量热门数据
  const allTimeData = ref([])

  // 本周热门数据
  const weeklyData = ref([])

  // 本月热门数据
  const monthlyData = ref([])

  // 加载状态
  const loading = ref(false)

  // 当前加载的系列
  const currentSeries = ref('')

  // ========================================
  // Getters
  // ========================================

  // 热门数据 Map（用于快速查找）
  const popularityMap = computed(() => {
    const map = new Map()
    allTimeData.value.forEach((item) => {
      map.set(item.filename, {
        rank: map.size + 1,
        score: item.popularity_score || 0,
        downloads: item.download_count || 0,
        views: item.view_count || 0,
      })
    })
    return map
  })

  // 本周热门 Map
  const weeklyMap = computed(() => {
    const map = new Map()
    weeklyData.value.forEach((item) => {
      map.set(item.filename, {
        rank: map.size + 1,
        score: item.popularity_score || 0,
        downloads: item.download_count || 0,
        views: item.view_count || 0,
      })
    })
    return map
  })

  // 本月热门 Map
  const monthlyMap = computed(() => {
    const map = new Map()
    monthlyData.value.forEach((item) => {
      map.set(item.filename, {
        rank: map.size + 1,
        score: item.popularity_score || 0,
        downloads: item.download_count || 0,
        views: item.view_count || 0,
      })
    })
    return map
  })

  // 是否有热门数据
  const hasData = computed(() => allTimeData.value.length > 0)

  // ========================================
  // Actions
  // ========================================

  /**
   * 获取指定文件的热门排名
   */
  function getPopularRank(filename) {
    return popularityMap.value.get(filename)?.rank || 0
  }

  /**
   * 获取指定文件的下载次数
   */
  function getDownloadCount(filename) {
    return popularityMap.value.get(filename)?.downloads || 0
  }

  /**
   * 获取指定文件的浏览次数
   */
  function getViewCount(filename) {
    return popularityMap.value.get(filename)?.views || 0
  }

  /**
   * 获取指定文件的热门分数
   */
  function getPopularityScore(filename, timeRange = 'all') {
    const map = timeRange === 'weekly'
      ? weeklyMap.value
      : timeRange === 'monthly'
        ? monthlyMap.value
        : popularityMap.value

    return map.get(filename)?.score || 0
  }

  /**
   * 加载热门数据
   */
  async function fetchPopularityData(series, forceRefresh = false) {
    // 如果已加载且不强制刷新，直接返回
    if (!forceRefresh && currentSeries.value === series && hasData.value) {
      return
    }

    // 立即清空旧数据，避免切换系列时显示旧数据
    allTimeData.value = []
    weeklyData.value = []
    monthlyData.value = []

    // 检查 Supabase 是否配置
    if (!isSupabaseConfigured()) {
      currentSeries.value = series
      return
    }

    loading.value = true
    currentSeries.value = series

    try {
      // 并行获取三种时间范围的热门数据
      const [all, weekly, monthly] = await Promise.all([
        getPopularWallpapers(series, 300),
        getPopularByTimeRange(series, 7, 300),
        getPopularByTimeRange(series, 30, 300),
      ])

      allTimeData.value = all
      weeklyData.value = weekly
      monthlyData.value = monthly
    }
    catch (err) {
      console.error('获取热门数据失败:', err)
      allTimeData.value = []
      weeklyData.value = []
      monthlyData.value = []
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 清除热门数据
   */
  function clearData() {
    allTimeData.value = []
    weeklyData.value = []
    monthlyData.value = []
    currentSeries.value = ''
  }

  return {
    // State
    allTimeData,
    weeklyData,
    monthlyData,
    loading,
    currentSeries,
    // Getters
    popularityMap,
    weeklyMap,
    monthlyMap,
    hasData,
    // Actions
    fetchPopularityData,
    getPopularRank,
    getDownloadCount,
    getViewCount,
    getPopularityScore,
    clearData,
  }
})
