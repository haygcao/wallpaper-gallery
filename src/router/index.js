import { createRouter, createWebHistory } from 'vue-router'
import { DEVICE_SERIES } from '@/utils/constants'

// ========================================
// 路由配置
// ========================================
const routes = [
  // 首页 - 根据设备类型自动选择系列
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: 'Wallpaper Gallery - 精选高清壁纸' },
  },
  // 电脑壁纸
  {
    path: '/desktop',
    name: 'Desktop',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '电脑壁纸 - Wallpaper Gallery',
      series: 'desktop',
    },
  },
  // 手机壁纸
  {
    path: '/mobile',
    name: 'Mobile',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '手机壁纸 - Wallpaper Gallery',
      series: 'mobile',
    },
  },
  // 头像
  {
    path: '/avatar',
    name: 'Avatar',
    component: () => import('@/views/Home.vue'),
    meta: {
      title: '头像 - Wallpaper Gallery',
      series: 'avatar',
    },
  },
  // 关于页面
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于我们 - Wallpaper Gallery' },
  },
  // 404 重定向到首页
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0, behavior: 'smooth' }
  },
})

// ========================================
// 路由守卫配置
// ========================================

// 存储键常量
const STORAGE_KEY_SERIES = 'wallpaper-gallery-current-series'
const STORAGE_KEY_USER_CHOICE = 'wallpaper-gallery-user-explicit-choice'

// 防止循环重定向的标记（使用 Set 记录最近的重定向路径）
const recentRedirects = new Set()
const MAX_REDIRECT_HISTORY = 3

/**
 * 获取当前设备类型
 * 优化：在客户端环境下，确保 window 对象已初始化
 */
function getDeviceType() {
  // 确保在客户端环境下执行
  if (typeof window === 'undefined') {
    return 'desktop' // 服务端默认返回桌面端
  }

  // 使用更可靠的设备检测方法
  // 优先使用 User Agent 检测，因为它不依赖于窗口大小
  const ua = navigator.userAgent.toLowerCase()
  const mobileKeywords = [
    'iphone',
    'ipod',
    'android.*mobile',
    'webos',
    'blackberry',
    'iemobile',
    'opera mini',
    'windows phone',
  ]

  // 先检查 UA，如果明确是移动设备，直接返回
  for (const keyword of mobileKeywords) {
    if (new RegExp(keyword).test(ua)) {
      return 'mobile'
    }
  }

  // 如果 UA 检测不确定，再使用窗口大小检测
  // 但需要确保窗口大小已正确初始化
  const width = window.innerWidth || window.screen?.width || 1024
  if (width < 768) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * 检查系列是否对当前设备可用
 */
function isSeriesAvailableForDevice(series, deviceType) {
  const available = DEVICE_SERIES[deviceType] || DEVICE_SERIES.desktop
  return available.includes(series)
}

/**
 * 获取用户应该看到的默认系列
 * 优先级：用户明确选择（如果对当前设备可用）> 设备类型推荐
 */
function getRecommendedSeries() {
  const deviceType = getDeviceType()
  const defaultSeries = deviceType === 'mobile' ? 'mobile' : 'desktop'

  // 1. 检查用户是否有明确的选择记录
  const userChoice = localStorage.getItem(STORAGE_KEY_USER_CHOICE)
  if (userChoice && isSeriesAvailableForDevice(userChoice, deviceType)) {
    return userChoice
  }

  // 2. 检查是否有保存的系列偏好
  const savedSeries = localStorage.getItem(STORAGE_KEY_SERIES)
  if (savedSeries && isSeriesAvailableForDevice(savedSeries, deviceType)) {
    return savedSeries
  }

  // 3. 使用设备默认系列
  return defaultSeries
}

/**
 * 记录用户的明确选择
 * 当用户主动点击导航时调用
 */
export function recordUserChoice(series) {
  localStorage.setItem(STORAGE_KEY_USER_CHOICE, series)
  localStorage.setItem(STORAGE_KEY_SERIES, series)
}

/**
 * 清除用户选择记录（用于重置）
 */
export function clearUserChoice() {
  localStorage.removeItem(STORAGE_KEY_USER_CHOICE)
}

// 路由守卫
router.beforeEach((to, from, next) => {
  // 更新页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检测设备类型
  const deviceType = getDeviceType()

  // 手机端访问电脑端路由时，自动重定向到手机端
  if (deviceType === 'mobile' && to.meta?.series === 'desktop') {
    // 手机端不允许访问电脑壁纸，重定向到手机壁纸
    next({ path: '/mobile', replace: true })
    return
  }

  // 如果直接访问具体系列页面（包括刷新），保存用户选择
  if (to.meta?.series) {
    // 直接访问系列页面时，保存为用户选择（刷新时也会触发）
    localStorage.setItem(STORAGE_KEY_SERIES, to.meta.series)
    // 如果是从其他页面导航过来，也记录为明确选择
    if (from.name) {
      recordUserChoice(to.meta.series)
    }
  }

  // 处理首页的智能重定向
  if (to.path === '/') {
    const recommendedSeries = getRecommendedSeries()
    const targetPath = `/${recommendedSeries}`

    // 安全检查：防止循环重定向
    // 1. 确保目标路径有效
    // 2. 确保目标路径不同于当前路径
    // 3. 确保不在最近的重定向历史中
    const redirectKey = `${from.path} -> ${targetPath}`
    if (
      recommendedSeries
      && targetPath !== from.path
      && !recentRedirects.has(redirectKey)
    ) {
      // 记录重定向历史（防止循环）
      recentRedirects.add(redirectKey)
      if (recentRedirects.size > MAX_REDIRECT_HISTORY) {
        // 只保留最近 N 条记录
        const firstKey = recentRedirects.values().next().value
        recentRedirects.delete(firstKey)
      }

      // 首页访问时，静默重定向到推荐系列
      // 使用 replace 避免产生历史记录
      next({ path: targetPath, replace: true })
      return
    }
  }

  // 清除重定向历史（非首页访问时）
  if (to.path !== '/') {
    recentRedirects.clear()
  }

  next()
})

export default router
