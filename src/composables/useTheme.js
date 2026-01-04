// ========================================
// 主题切换 Composable
// 支持：手动切换、跟随系统、根据时间自动切换
// ========================================

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { trackThemeChange } from '@/utils/analytics'
import { STORAGE_KEYS, THEME_MODES, THEMES } from '@/utils/constants'

// 当前实际显示的主题
const theme = ref(THEMES.LIGHT)
// 用户选择的主题模式
const themeMode = ref(THEME_MODES.SYSTEM)

// 时间检查定时器
let timeCheckInterval = null

// 应用主题到 DOM
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme.value)
}

// 根据时间判断应该使用的主题（6:00-18:00 浅色，其他深色）
function getThemeByTime() {
  const hour = new Date().getHours()
  return (hour >= 6 && hour < 18) ? THEMES.LIGHT : THEMES.DARK
}

// 根据系统偏好判断主题
function getThemeBySystem() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEMES.DARK
    : THEMES.LIGHT
}

// 根据模式计算实际主题
function computeTheme(mode) {
  switch (mode) {
    case THEME_MODES.LIGHT:
      return THEMES.LIGHT
    case THEME_MODES.DARK:
      return THEMES.DARK
    case THEME_MODES.SYSTEM:
      return getThemeBySystem()
    case THEME_MODES.AUTO:
      return getThemeByTime()
    default:
      return getThemeBySystem()
  }
}

export function useTheme() {
  // 停止时间检查
  const stopTimeCheck = () => {
    if (timeCheckInterval) {
      clearInterval(timeCheckInterval)
      timeCheckInterval = null
    }
  }

  // 启动时间检查（每分钟检查一次）
  const startTimeCheck = () => {
    stopTimeCheck()
    timeCheckInterval = setInterval(() => {
      if (themeMode.value === THEME_MODES.AUTO) {
        const newTheme = getThemeByTime()
        if (theme.value !== newTheme) {
          theme.value = newTheme
        }
      }
    }, 60000) // 每分钟检查
  }

  // 初始化主题
  const initTheme = () => {
    // 读取用户保存的主题模式
    const savedMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE)
    if (savedMode && Object.values(THEME_MODES).includes(savedMode)) {
      themeMode.value = savedMode
    }
    else {
      // 默认跟随系统
      themeMode.value = THEME_MODES.SYSTEM
    }

    // 计算并应用主题（立即应用，避免闪烁）
    theme.value = computeTheme(themeMode.value)
    applyTheme()

    // 如果是自动模式，启动时间检查
    if (themeMode.value === THEME_MODES.AUTO) {
      startTimeCheck()
      // 立即检查一次时间（因为定时器是每分钟检查一次）
      const currentTheme = getThemeByTime()
      if (theme.value !== currentTheme) {
        theme.value = currentTheme
      }
    }
  }

  // 切换主题（简单切换浅/深）
  const toggleTheme = () => {
    // 切换到手动模式
    if (theme.value === THEMES.LIGHT) {
      themeMode.value = THEME_MODES.DARK
    }
    else {
      themeMode.value = THEME_MODES.LIGHT
    }
    trackThemeChange(theme.value)
  }

  // 设置主题模式
  const setThemeMode = (mode) => {
    if (Object.values(THEME_MODES).includes(mode)) {
      themeMode.value = mode
      trackThemeChange(`mode:${mode}`)
    }
  }

  // 设置指定主题（直接设置，会切换到手动模式）
  const setTheme = (newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      themeMode.value = newTheme // light 或 dark
    }
  }

  // 监听主题模式变化
  watch(themeMode, (newMode) => {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode)

    // 计算新主题
    theme.value = computeTheme(newMode)

    // 管理时间检查
    if (newMode === THEME_MODES.AUTO) {
      startTimeCheck()
    }
    else {
      stopTimeCheck()
    }
  })

  // 监听实际主题变化
  watch(theme, () => {
    applyTheme()
  })

  // 组件挂载时初始化
  onMounted(() => {
    initTheme()

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (themeMode.value === THEME_MODES.SYSTEM) {
        theme.value = getThemeBySystem()
      }
    }
    mediaQuery.addEventListener('change', handleSystemChange)

    // 清理函数会在 onUnmounted 中处理
  })

  onUnmounted(() => {
    stopTimeCheck()
  })

  // 计算属性
  const isDark = computed(() => theme.value === THEMES.DARK)

  // 主题模式选项（用于UI选择器）
  const themeModeOptions = [
    { value: THEME_MODES.LIGHT, label: '浅色', icon: '☀️' },
    { value: THEME_MODES.DARK, label: '深色', icon: '🌙' },
    { value: THEME_MODES.SYSTEM, label: '跟随系统', icon: '💻' },
    { value: THEME_MODES.AUTO, label: '自动（按时间）', icon: '🕐' },
  ]

  return {
    theme,
    themeMode,
    isDark,
    themeModeOptions,
    toggleTheme,
    setTheme,
    setThemeMode,
    initTheme,
  }
}
