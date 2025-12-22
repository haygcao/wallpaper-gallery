// ========================================
// 分页/无限滚动 Composable
// ========================================

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

export function usePagination(items, pageSize = 30) {
  const currentPage = ref(1)
  const isLoading = ref(false)
  const observerTarget = ref(null)
  let observer = null

  // 当前显示的项目
  const displayedItems = computed(() => {
    return items.value.slice(0, currentPage.value * pageSize)
  })

  // 是否还有更多
  const hasMore = computed(() => {
    return displayedItems.value.length < items.value.length
  })

  // 加载更多 - 同步立即加载，无延迟
  const loadMore = () => {
    if (!hasMore.value)
      return

    // 直接增加页数，同步更新
    currentPage.value++
  }

  // 重置分页（当筛选条件变化时）
  const resetPagination = () => {
    currentPage.value = 1
  }

  // 监听 items 变化，重置分页
  watch(() => items.value.length, () => {
    resetPagination()
  })

  // 设置 Intersection Observer
  const setupObserver = () => {
    // 先断开旧的 observer
    if (observer) {
      observer.disconnect()
    }

    if (!observerTarget.value)
      return

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore.value) {
          loadMore()
        }
      },
      {
        // 增加预加载距离到 800px，快速滚动也能及时加载
        rootMargin: '800px',
        threshold: 0,
      },
    )

    observer.observe(observerTarget.value)
  }

  // 监听 observerTarget 变化，确保 observer 正确绑定
  watch(observerTarget, (newTarget) => {
    if (newTarget) {
      setupObserver()
    }
  })

  onMounted(() => {
    // 使用 nextTick 确保 DOM 渲染完成
    nextTick(setupObserver)
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    displayedItems,
    hasMore,
    isLoading,
    loadMore,
    resetPagination,
    observerTarget,
    currentPage,
  }
}
