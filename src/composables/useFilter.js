// ========================================
// 搜索和筛选 Composable
// ========================================

import { computed, ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/utils/constants'
import { debounce } from '@/utils/format'

export function useFilter(wallpapers, externalSearchQuery = null) {
  // 搜索关键词（支持外部传入或内部管理）
  const searchQuery = externalSearchQuery || ref('')
  const debouncedQuery = ref('')

  // 排序方式
  const sortBy = ref(localStorage.getItem(STORAGE_KEYS.SORT) || 'newest')

  // 格式筛选
  const formatFilter = ref('all')

  // 分类筛选（一级分类）
  const categoryFilter = ref(localStorage.getItem(STORAGE_KEYS.CATEGORY) || 'all')

  // 二级分类筛选
  const subcategoryFilter = ref('all')

  // 防抖处理搜索
  const updateDebouncedQuery = debounce((value) => {
    debouncedQuery.value = value
  }, 300)

  watch(searchQuery, (value) => {
    updateDebouncedQuery(value)
  })

  // 保存排序偏好
  watch(sortBy, (value) => {
    localStorage.setItem(STORAGE_KEYS.SORT, value)
  })

  // 保存分类筛选偏好
  watch(categoryFilter, (value) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORY, value)
    // 切换一级分类时重置二级分类
    subcategoryFilter.value = 'all'
  })

  // 动态生成分类选项（从壁纸数据中提取，包含二级分类信息）
  const categoryOptions = computed(() => {
    // 统计一级分类
    const categoryCount = {}
    // 统计二级分类 { '游戏': { '原神': 5, '崩坏': 3 }, ... }
    const subcategoryCount = {}

    wallpapers.value.forEach((w) => {
      if (w.category) {
        categoryCount[w.category] = (categoryCount[w.category] || 0) + 1

        // 统计二级分类（仅当存在时）
        if (w.subcategory) {
          if (!subcategoryCount[w.category]) {
            subcategoryCount[w.category] = {}
          }
          subcategoryCount[w.category][w.subcategory] = (subcategoryCount[w.category][w.subcategory] || 0) + 1
        }
      }
    })

    // 排序分类（按数量降序）
    const sortedCategories = Object.keys(categoryCount).sort((a, b) => {
      return (categoryCount[b] || 0) - (categoryCount[a] || 0)
    })

    // 返回选项格式（包含二级分类信息）
    return [
      { value: 'all', label: '全部分类', count: wallpapers.value.length },
      ...sortedCategories.map((cat) => {
        const subcats = subcategoryCount[cat]
        let subcategories = []

        if (subcats) {
          // 将二级分类转换为数组并排序
          subcategories = Object.entries(subcats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        }

        return {
          value: cat,
          label: cat,
          count: categoryCount[cat],
          // 仅当有二级分类时才添加
          ...(subcategories.length > 0 && { subcategories }),
        }
      }),
    ]
  })

  // 当前一级分类的二级分类选项
  const subcategoryOptions = computed(() => {
    if (categoryFilter.value === 'all') {
      return [{ value: 'all', label: '全部' }]
    }

    const currentCategory = categoryOptions.value.find(opt => opt.value === categoryFilter.value)
    if (currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0) {
      return [
        { value: 'all', label: '全部' },
        ...currentCategory.subcategories.map(sub => ({
          value: sub.name,
          label: `${sub.name} (${sub.count})`,
        })),
      ]
    }

    return [{ value: 'all', label: '全部' }]
  })

  // 当分类选项变化时，检查当前选中的分类是否仍然有效
  watch(categoryOptions, (newOptions) => {
    const validValues = newOptions.map(opt => opt.value)
    if (!validValues.includes(categoryFilter.value)) {
      categoryFilter.value = 'all'
    }
  })

  // 过滤后的壁纸列表
  const filteredWallpapers = computed(() => {
    let result = [...wallpapers.value]

    // 搜索过滤（匹配文件名、分类、二级分类、标签）
    if (debouncedQuery.value) {
      const query = debouncedQuery.value.toLowerCase()
      result = result.filter(w =>
        w.filename.toLowerCase().includes(query)
        || w.category?.toLowerCase().includes(query)
        || w.subcategory?.toLowerCase().includes(query)
        || (w.tags && w.tags.some(tag => tag.toLowerCase().includes(query))),
      )
    }

    // 格式过滤
    if (formatFilter.value !== 'all') {
      result = result.filter(w =>
        w.format.toLowerCase() === formatFilter.value.toLowerCase(),
      )
    }

    // 一级分类过滤
    if (categoryFilter.value !== 'all') {
      result = result.filter(w =>
        w.category === categoryFilter.value,
      )
    }

    // 二级分类过滤
    if (subcategoryFilter.value !== 'all') {
      result = result.filter(w =>
        w.subcategory === subcategoryFilter.value,
      )
    }

    // 排序
    switch (sortBy.value) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'largest':
        result.sort((a, b) => b.size - a.size)
        break
      case 'smallest':
        result.sort((a, b) => a.size - b.size)
        break
      case 'name-asc':
        result.sort((a, b) => a.filename.localeCompare(b.filename))
        break
      case 'name-desc':
        result.sort((a, b) => b.filename.localeCompare(a.filename))
        break
    }

    return result
  })

  // 搜索结果数量
  const resultCount = computed(() => filteredWallpapers.value.length)

  // 是否有激活的筛选条件
  const hasActiveFilters = computed(() => {
    return debouncedQuery.value || formatFilter.value !== 'all' || categoryFilter.value !== 'all' || subcategoryFilter.value !== 'all'
  })

  // 重置所有筛选条件
  const resetFilters = () => {
    searchQuery.value = ''
    debouncedQuery.value = ''
    formatFilter.value = 'all'
    categoryFilter.value = 'all'
    subcategoryFilter.value = 'all'
    sortBy.value = 'newest'
  }

  return {
    searchQuery,
    sortBy,
    formatFilter,
    categoryFilter,
    subcategoryFilter,
    categoryOptions,
    subcategoryOptions,
    filteredWallpapers,
    resultCount,
    hasActiveFilters,
    resetFilters,
  }
}
