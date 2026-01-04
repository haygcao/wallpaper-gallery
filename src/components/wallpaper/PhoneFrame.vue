<script setup>
import { gsap } from 'gsap'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useDevice } from '@/composables/useDevice'

defineProps({
  isDark: {
    type: Boolean,
    default: false,
  },
})

// 设备尺寸类型
const DEVICE_SIZES = {
  STANDARD: 'standard', // 标准版：375 × 812
  PRO: 'pro', // Pro：393 × 852
  PRO_MAX: 'proMax', // Pro Max：430 × 932
}

// 设备尺寸配置
const deviceSizeConfig = {
  [DEVICE_SIZES.STANDARD]: {
    width: 375,
    height: 812,
    label: '标准版',
    mobileWidth: 320,
    mobileHeight: 693,
  },
  [DEVICE_SIZES.PRO]: {
    width: 393,
    height: 852,
    label: 'Pro',
    mobileWidth: 340,
    mobileHeight: 735,
  },
  [DEVICE_SIZES.PRO_MAX]: {
    width: 430,
    height: 932,
    label: 'Pro Max',
    mobileWidth: 360,
    mobileHeight: 780,
  },
}

// 从 localStorage 读取保存的设备尺寸，默认使用标准版
const STORAGE_KEY = 'phone-frame-device-size'
const deviceSize = ref(localStorage.getItem(STORAGE_KEY) || DEVICE_SIZES.STANDARD)

// 设备检测
const { isMobile, isDesktop } = useDevice()

// 选择器展开/收缩状态（PC端默认展开，移动端默认收缩）
// 初始值根据设备类型设置，但需要等待 onMounted 时再确认
const isExpanded = ref(false)

// 悬浮球位置（从 localStorage 读取或使用默认位置）
const POSITION_STORAGE_KEY = 'phone-frame-size-selector-position'
let savedPosition = null
try {
  const saved = localStorage.getItem(POSITION_STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    savedPosition = { x: parsed.x, y: parsed.y }
  }
}
catch (e) {
  console.warn('Failed to load saved position:', e)
}
// 初始位置会在 onMounted 时计算，确保使用正确的窗口尺寸
const position = ref(savedPosition || { x: 0, y: 0 })

// 拖拽状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })
const hasDragged = ref(false) // 标记是否发生了拖拽
const shouldTriggerClick = ref(false) // 标记是否应该触发点击（在 mouseup 时）

// 悬浮球和选项容器引用
const selectorRef = ref(null)
const optionsRef = ref(null)
let expandAnimation = null
let positionAnimation = null

// 使用 GSAP 处理展开/收缩动画（仅移动端悬浮球使用）
async function toggleExpand(newExpanded) {
  // PC端下拉框不需要 GSAP 动画，使用 CSS transition
  if (isDesktop.value) {
    return
  }

  if (!optionsRef.value || !selectorRef.value)
    return

  // 取消之前的动画
  if (expandAnimation) {
    expandAnimation.kill()
  }

  await nextTick()

  if (newExpanded) {
    // 展开：先设置获取实际尺寸，然后从悬浮球位置展开
    gsap.set(optionsRef.value, {
      display: 'flex',
      height: 'auto',
      width: 'auto',
      opacity: 0,
      scale: 0.8,
      transformOrigin: 'top right',
    })
    const height = optionsRef.value.offsetHeight
    const width = optionsRef.value.offsetWidth
    gsap.set(optionsRef.value, {
      height: 0,
      width: 0,
      opacity: 0,
      scale: 0.8,
    })

    // 使用 GSAP Timeline 实现更丝滑的动画（无弹性效果）
    const tl = gsap.timeline()
    tl.to(optionsRef.value, {
      height,
      width,
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    })
    expandAnimation = tl

    // 悬浮球缩小并淡出
    const floatingBall = selectorRef.value?.querySelector('.size-selector__floating-ball')
    if (floatingBall) {
      gsap.to(floatingBall, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      })
    }
  }
  else {
    // 收缩：先缩小，然后隐藏
    const height = optionsRef.value.offsetHeight
    const width = optionsRef.value.offsetWidth
    gsap.set(optionsRef.value, { height, width, opacity: 1, scale: 1 })

    const tl = gsap.timeline()
    tl.to(optionsRef.value, {
      height: 0,
      width: 0,
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(optionsRef.value, { height: 0, width: 0, display: 'none' })
      },
    })
    expandAnimation = tl

    // 悬浮球恢复显示（无弹性效果）
    const floatingBall = selectorRef.value?.querySelector('.size-selector__floating-ball')
    if (floatingBall) {
      gsap.set(floatingBall, { display: 'flex', scale: 0, opacity: 0 })
      gsap.to(floatingBall, {
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        delay: 0.15,
      })
    }
  }
}

// 监听设备类型变化，更新展开状态
watch(isDesktop, (newIsDesktop) => {
  isExpanded.value = newIsDesktop
})

// 监听展开状态变化（仅移动端需要动画）
watch(isExpanded, (newExpanded) => {
  if (!isDesktop.value) {
    toggleExpand(newExpanded)
  }
})

// 保存位置到 localStorage
function savePosition() {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position.value))
  }
  catch (e) {
    console.warn('Failed to save position:', e)
  }
}

// 拖拽处理
function handleDragStart(e) {
  // 阻止事件冒泡，避免触发父元素的点击事件
  e.stopPropagation()
  e.preventDefault()

  isDragging.value = true
  hasDragged.value = false
  shouldTriggerClick.value = true // 标记可能触发点击
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  dragStart.value = { x: clientX, y: clientY }
  dragOffset.value = { x: 0, y: 0 }
}

function handleDragMove(e) {
  if (!isDragging.value)
    return

  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY

  dragOffset.value = {
    x: clientX - dragStart.value.x,
    y: clientY - dragStart.value.y,
  }

  // 如果移动距离超过阈值，标记为拖拽
  if (Math.abs(dragOffset.value.x) > 5 || Math.abs(dragOffset.value.y) > 5) {
    hasDragged.value = true
  }

  // 实时更新位置（使用 GSAP 实现丝滑动画）
  if (selectorRef.value && hasDragged.value) {
    const ballSize = 56 // 悬浮球大小
    const newX = position.value.x + dragOffset.value.x
    const newY = position.value.y + dragOffset.value.y

    // 限制在可视区域内
    const maxX = window.innerWidth - ballSize
    const maxY = window.innerHeight - ballSize

    const clampedX = Math.max(0, Math.min(newX, maxX))
    const clampedY = Math.max(0, Math.min(newY, maxY))

    gsap.set(selectorRef.value, {
      x: clampedX,
      y: clampedY,
    })
  }

  e.preventDefault()
}

function handleDragEnd() {
  if (!isDragging.value)
    return

  // 如果发生了拖拽，更新最终位置
  if (hasDragged.value) {
    const ballSize = 56
    const newX = position.value.x + dragOffset.value.x
    const newY = position.value.y + dragOffset.value.y

    // 限制在可视区域内
    const maxX = window.innerWidth - ballSize
    const maxY = window.innerHeight - ballSize

    position.value = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    }

    // 使用 GSAP 平滑移动到最终位置（如果有边界限制）
    if (selectorRef.value) {
      if (positionAnimation) {
        positionAnimation.kill()
      }
      positionAnimation = gsap.to(selectorRef.value, {
        x: position.value.x,
        y: position.value.y,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          savePosition()
        },
      })
    }
    else {
      savePosition()
    }

    // 如果发生了拖拽，不触发点击
    shouldTriggerClick.value = false
    // 延迟重置状态
    setTimeout(() => {
      isDragging.value = false
      dragOffset.value = { x: 0, y: 0 }
      hasDragged.value = false
    }, 100)
  }
  else {
    // 如果没有拖拽（只是点击），立即重置状态，允许点击事件触发
    isDragging.value = false
    dragOffset.value = { x: 0, y: 0 }
    hasDragged.value = false
    // shouldTriggerClick 保持为 true，等待 mouseup 事件触发点击
  }
}

// 点击悬浮球展开/收缩（区分拖拽和点击）
// 注意：这个函数在 mouseup/touchend 时调用
function handleFloatingBallClick(e) {
  // 阻止事件冒泡，避免触发父元素的点击事件（如真机退出提示）
  e.stopPropagation()
  e.preventDefault()

  // 如果发生了拖拽，或者不应该触发点击，则不处理
  if (hasDragged.value || !shouldTriggerClick.value) {
    shouldTriggerClick.value = false
    return
  }

  // 直接切换展开状态
  isExpanded.value = !isExpanded.value
  shouldTriggerClick.value = false
}

// 点击外部区域关闭展开的选项列表
function handleClickOutside(e) {
  // 如果选项列表已展开，且点击的不是选择器内的元素，则关闭
  if (isExpanded.value && selectorRef.value && !selectorRef.value.contains(e.target)) {
    // 确保不是点击悬浮球本身（虽然应该已经被 stopPropagation 阻止了）
    const floatingBall = selectorRef.value.querySelector('.size-selector__floating-ball')
    if (floatingBall && floatingBall.contains(e.target)) {
      return
    }
    isExpanded.value = false
  }
}

// 当前设备尺寸配置（根据屏幕大小选择 PC 端或移动端尺寸）
const currentSizeConfig = computed(() => {
  const config = deviceSizeConfig[deviceSize.value] || deviceSizeConfig[DEVICE_SIZES.STANDARD]
  if (isMobile.value) {
    return {
      ...config,
      width: config.mobileWidth,
      height: config.mobileHeight,
    }
  }
  return config
})

// 处理尺寸切换
function handleSizeChange(size) {
  deviceSize.value = size
  localStorage.setItem(STORAGE_KEY, size)
  // 切换后自动收缩
  isExpanded.value = false
}

const currentTime = ref('00:14')

function updateTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}`
}

let timeInterval = null

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  // 根据设备类型初始化展开状态
  isExpanded.value = isDesktop.value

  // 初始化展开状态和悬浮球位置（仅移动端）
  nextTick(() => {
    // PC端下拉框不需要初始化动画
    if (isDesktop.value) {
      return
    }

    if (optionsRef.value) {
      if (isExpanded.value) {
        gsap.set(optionsRef.value, {
          display: 'flex',
          height: 'auto',
          width: 'auto',
          opacity: 1,
          scale: 1,
        })
      }
      else {
        gsap.set(optionsRef.value, {
          display: 'none',
          height: 0,
          width: 0,
          opacity: 0,
          scale: 0.8,
        })
      }
    }

    // 初始化悬浮球位置（如果没有保存的位置，使用右侧中间）
    if (selectorRef.value && !isDesktop.value) {
      // 如果没有保存的位置，计算右侧中间位置
      if (!savedPosition) {
        const ballSize = 56
        const margin = 20
        // 确保使用正确的窗口尺寸
        const windowWidth = window.innerWidth || document.documentElement.clientWidth || window.screen?.width || 1024
        const windowHeight = window.innerHeight || document.documentElement.clientHeight || window.screen?.height || 768
        // 右侧中间：x = 窗口宽度 - 球大小 - 边距，y = (窗口高度 - 球大小) / 2
        const initX = Math.max(0, windowWidth - ballSize - margin)
        const initY = Math.max(margin, (windowHeight - ballSize) / 2)
        position.value = { x: initX, y: initY }
        // 保存初始位置
        savePosition()
      }

      // 设置悬浮球容器的位置和显示
      gsap.set(selectorRef.value, {
        x: position.value.x,
        y: position.value.y,
        display: 'flex', // 确保显示
      })

      // 确保悬浮球默认显示（如果未展开）
      if (!isExpanded.value) {
        const floatingBall = selectorRef.value.querySelector('.size-selector__floating-ball')
        if (floatingBall) {
          gsap.set(floatingBall, {
            display: 'flex',
            scale: 1,
            opacity: 1,
          })
        }
      }
    }
  })

  // 添加全局拖拽事件监听
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchmove', handleDragMove, { passive: false })
  document.addEventListener('touchend', handleDragEnd)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  // 清理 GSAP 动画
  if (expandAnimation) {
    expandAnimation.kill()
  }
  if (positionAnimation) {
    positionAnimation.kill()
  }
  // 移除全局事件监听
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDragMove)
  document.removeEventListener('touchend', handleDragEnd)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="phone-frame" :class="{ 'phone-frame--dark': isDark }">
    <!-- PC端：下拉框样式 -->
    <div
      v-if="isDesktop"
      class="phone-frame__size-selector phone-frame__size-selector--dropdown"
      :class="{ 'is-expanded': isExpanded }"
      @click.stop
    >
      <!-- 触发按钮（当前选中项） -->
      <button
        class="size-selector__trigger"
        @click.stop="isExpanded = !isExpanded"
      >
        <span class="trigger__label">{{ currentSizeConfig.label }}</span>
        <span class="trigger__dimensions">{{ currentSizeConfig.width }}×{{ currentSizeConfig.height }}</span>
        <svg
          class="trigger__icon"
          :class="{ 'is-expanded': isExpanded }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <!-- 选项列表（可展开/收缩） -->
      <div
        ref="optionsRef"
        class="size-selector__options"
      >
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.STANDARD }"
          @click.stop="handleSizeChange(DEVICE_SIZES.STANDARD)"
        >
          <span class="size-option__label">标准版</span>
          <span class="size-option__dimensions">375×812</span>
        </button>
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.PRO }"
          @click.stop="handleSizeChange(DEVICE_SIZES.PRO)"
        >
          <span class="size-option__label">Pro</span>
          <span class="size-option__dimensions">393×852</span>
        </button>
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.PRO_MAX }"
          @click.stop="handleSizeChange(DEVICE_SIZES.PRO_MAX)"
        >
          <span class="size-option__label">Pro Max</span>
          <span class="size-option__dimensions">430×932</span>
        </button>
      </div>
    </div>

    <!-- 移动端：悬浮球形式，可拖拽 -->
    <div
      v-else
      ref="selectorRef"
      class="phone-frame__size-selector phone-frame__size-selector--floating"
      :class="{ 'is-expanded': isExpanded, 'is-dragging': isDragging }"
    >
      <!-- 悬浮球（默认显示） -->
      <button
        class="size-selector__floating-ball"
        @mousedown.stop="handleDragStart"
        @mouseup.stop="handleFloatingBallClick"
        @touchstart.stop="handleDragStart"
        @touchend.stop="handleFloatingBallClick"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </button>

      <!-- 展开的选项列表 -->
      <div
        ref="optionsRef"
        class="size-selector__options"
      >
        <!-- 移动端：选项列表头部 -->
        <div v-if="!isDesktop" class="size-selector__header">
          <span class="header__label">设备尺寸</span>
          <button
            class="header__close"
            @click.stop="isExpanded = false"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.STANDARD }"
          @click.stop="handleSizeChange(DEVICE_SIZES.STANDARD)"
        >
          <span class="size-option__label">标准版</span>
          <span class="size-option__dimensions">375×812</span>
        </button>
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.PRO }"
          @click.stop="handleSizeChange(DEVICE_SIZES.PRO)"
        >
          <span class="size-option__label">Pro</span>
          <span class="size-option__dimensions">393×852</span>
        </button>
        <button
          class="size-option"
          :class="{ 'is-active': deviceSize === DEVICE_SIZES.PRO_MAX }"
          @click.stop="handleSizeChange(DEVICE_SIZES.PRO_MAX)"
        >
          <span class="size-option__label">Pro Max</span>
          <span class="size-option__dimensions">430×932</span>
        </button>
      </div>
    </div>

    <!-- 手机外框 -->
    <div
      class="phone-frame__device"
      :style="{
        width: `${currentSizeConfig.width}px`,
        height: `${currentSizeConfig.height}px`,
      }"
    >
      <!-- 顶部刘海/听筒 -->
      <div class="phone-frame__notch">
        <div class="phone-frame__speaker" />
      </div>

      <!-- 屏幕区域 -->
      <div class="phone-frame__screen">
        <!-- Dynamic Island (iPhone 16/14 样式) - 单独显示，不包含时间 -->
        <div class="phone-frame__dynamic-island" />

        <!-- 壁纸内容区域 -->
        <div class="phone-frame__content">
          <slot />
          <!-- 时间显示在壁纸中间，大字体加粗 -->
          <div class="phone-frame__wallpaper-time">
            {{ currentTime }}
          </div>
        </div>
      </div>

      <!-- 底部指示器（Home Indicator） -->
      <div class="phone-frame__home-indicator" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.phone-frame {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-xl;
  // 使用更柔和的背景色，避免与图片对比太强烈
  background: #f5f5f5; // 浅灰色背景
  border-radius: $radius-2xl;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  // 优化过渡，避免闪烁
  transition: background-color 0.2s ease;

  &--dark {
    background: #f5f5f5;
  }
}

// 设备尺寸选择器
.phone-frame__size-selector {
  z-index: 10000; // 确保在真机退出提示（9999）之上
}

// PC端：下拉框样式
.phone-frame__size-selector--dropdown {
  position: absolute;
  top: $spacing-md;
  right: $spacing-md;
  display: flex;
  flex-direction: column;
  min-width: 140px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: $radius-lg;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  z-index: 10000; // 确保在真机退出提示之上

  &.is-expanded {
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.16),
      0 4px 16px rgba(0, 0, 0, 0.12);
  }
}

// 触发按钮（当前选中项）
.size-selector__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .trigger__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: #000000;
    flex: 1;
  }

  .trigger__dimensions {
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: rgba(0, 0, 0, 0.6);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  .trigger__icon {
    width: 16px;
    height: 16px;
    color: rgba(0, 0, 0, 0.5);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;

    &.is-expanded {
      transform: rotate(180deg);
    }
  }
}

// 移动端：悬浮球形式，可拖拽
.phone-frame__size-selector--floating {
  position: fixed;
  display: flex !important; // 确保显示
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none; // 默认不阻挡，展开后恢复
  will-change: transform;
  z-index: 10000; // 确保在最上层

  &.is-expanded {
    pointer-events: auto;
  }

  &.is-dragging {
    cursor: grabbing;
    user-select: none;

    .size-selector__floating-ball {
      cursor: grabbing;
    }
  }
}

// 悬浮球（默认显示）
.size-selector__floating-ball {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  border: none;
  border-radius: $radius-full;
  color: #ffffff;
  cursor: grab;
  pointer-events: auto;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.25),
    0 2px 10px rgba(0, 0, 0, 0.15),
    0 0 0 2px rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, box-shadow, opacity;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover {
    transform: scale(1.1);
    box-shadow:
      0 6px 28px rgba(0, 0, 0, 0.3),
      0 4px 16px rgba(0, 0, 0, 0.2),
      0 0 0 3px rgba(255, 255, 255, 0.15);
  }

  &:active {
    transform: scale(0.95);
    cursor: grabbing;
  }
}

// 展开的选项列表
.size-selector__options {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// PC端下拉框选项列表样式
.phone-frame__size-selector--dropdown .size-selector__options {
  min-width: 140px;
  max-height: 0;
  opacity: 0;
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  pointer-events: none;
}

.phone-frame__size-selector--dropdown.is-expanded .size-selector__options {
  max-height: 500px;
  opacity: 1;
  pointer-events: auto;
}

// 移动端悬浮球选项列表样式
.phone-frame__size-selector--floating .size-selector__options {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 160px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: $radius-lg;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  transform-origin: top right;
  will-change: transform, opacity, height, width;
}

// 选项列表头部
.size-selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);

  .header__label {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    color: #000000;
  }

  .header__close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: $radius-sm;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.08);
      color: #000000;
    }
  }
}

.size-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.is-active {
    background: #000000;
    color: #ffffff;

    .size-option__label {
      color: #ffffff;
      font-weight: $font-weight-semibold;
    }

    .size-option__dimensions {
      color: rgba(255, 255, 255, 0.85);
    }
  }

  &:active {
    transform: scale(0.98);
    background: rgba(0, 0, 0, 0.06);
  }
}

.size-option__label {
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  color: #000000;
}

.size-option__dimensions {
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  color: rgba(0, 0, 0, 0.6);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

// GSAP 动画已处理展开/收缩，无需 CSS transition

.phone-frame__device {
  position: relative;
  // 尺寸通过内联样式动态设置
  background: #000;
  border-radius: 50px; // 苹果大R角设计
  padding: 8px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.1),
    inset 0 0 0 2px rgba(0, 0, 0, 0.2),
    0 10px 40px rgba(0, 0, 0, 0.5);
  transition:
    width 0.3s ease,
    height 0.3s ease;
}

// Dynamic Island (iPhone 16/14 样式) - 单独显示，不包含内容
.phone-frame__dynamic-island {
  position: absolute;
  top: 0; // 和状态栏平齐
  left: 50%;
  transform: translateX(-50%);
  width: 125px; // 增加宽度：110px -> 140px
  height: 30px; // 降低高度：35px -> 28px
  background: #000;
  border-radius: 30px;
  z-index: 10;
  margin-top: 8px; // 稍微下移一点，和状态栏对齐
}

// 壁纸靠上显示的时间（大字体加粗）
.phone-frame__wallpaper-time {
  position: absolute;
  top: 5%; // 向上移动：12% -> 8%
  left: 50%;
  transform: translateX(-50%); // 只水平居中
  font-size: 105px; // 增大字体：100px -> 130px
  font-weight: 600; // 加粗
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
  letter-spacing: 2px; // 增加数字间隔：-2px -> 8px
  white-space: nowrap;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); // 添加阴影增强可读性
  z-index: 5;
  pointer-events: none; // 不阻挡点击
}

.phone-frame__screen {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 42px; // 与外壳R角匹配
  overflow: hidden;
  position: relative;
}

.phone-frame__content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.phone-frame__home-indicator {
  position: absolute;
  bottom: 18px; // 距离底部更高
  left: 50%;
  transform: translateX(-50%);
  width: 134px;
  height: 6px; // 更粗一点
  background: #ffffff; // 白色
  border-radius: 3px;
  z-index: 10;
}

// 响应式调整
@media (max-width: 768px) {
  .phone-frame {
    padding: $spacing-md;
    background: rgba(255, 255, 255, 0.98); // 移动端也使用亮色背景
  }

  .phone-frame__device {
    // 移动端尺寸通过内联样式动态设置
    border-radius: 42px; // 移动端也使用大R角
  }

  .phone-frame__size-selector {
    top: $spacing-sm;
    right: $spacing-sm;
    min-width: 120px;
    border-radius: $radius-md;
  }

  .size-selector__trigger {
    padding: 10px 12px;

    .trigger__label {
      font-size: $font-size-xs;
    }

    .trigger__dimensions {
      font-size: 10px;
    }

    .trigger__icon {
      width: 14px;
      height: 14px;
    }
  }

  .size-option {
    padding: 8px 12px;
  }

  .size-option__label {
    font-size: $font-size-xs;
  }

  .size-option__dimensions {
    font-size: 10px;
  }

  .phone-frame__screen {
    border-radius: 36px; // 与外壳R角匹配
  }

  .phone-frame__dynamic-island {
    top: 0;
    width: 120px; // 增加宽度：110px -> 120px
    height: 26px; // 降低高度：32px -> 26px
    border-radius: 16px;
    margin-top: 6px;
  }

  .phone-frame__wallpaper-time {
    font-size: 80px; // 增大字体：60px -> 80px
    letter-spacing: 6px; // 增加数字间隔：-1.5px -> 6px
  }

  .phone-frame__home-indicator {
    bottom: 16px; // 移动端也调整
  }

  // 移动端悬浮球优化
  .phone-frame__size-selector {
    .size-selector__floating-ball {
      width: 52px;
      height: 52px;
      box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.2),
        0 0 0 2px rgba(255, 255, 255, 0.15);

      svg {
        width: 22px;
        height: 22px;
      }

      &:active {
        transform: scale(0.92);
      }
    }

    .size-selector__options {
      min-width: 150px;
      border-radius: $radius-md;
    }

    .size-selector__header {
      padding: 10px 12px;
    }

    .size-option {
      padding: 10px 12px;
    }
  }
}
</style>
