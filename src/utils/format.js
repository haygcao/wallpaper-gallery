// ========================================
// 格式化工具函数
// ========================================

import { RESOLUTION_THRESHOLDS } from '@/utils/constants'

/**
 * 根据真实分辨率获取标签
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 * @returns {object} { width, height, label, type }
 */
export function getResolutionLabel(width, height) {
  const maxSide = Math.max(width, height) // 取长边判断
  for (const threshold of RESOLUTION_THRESHOLDS) {
    if (maxSide >= threshold.minWidth) {
      return {
        width,
        height,
        label: threshold.label,
        type: threshold.type,
      }
    }
  }
  return { width, height, label: '标清', type: 'secondary' }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export function formatFileSize(bytes) {
  if (bytes === 0)
    return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${units[i]}`
}

/**
 * 格式化日期
 * @param {string|number|Date} date - 日期
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化相对时间
 * @param {string|number|Date} date - 日期
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0)
    return `${years} 年前`
  if (months > 0)
    return `${months} 个月前`
  if (days > 0)
    return `${days} 天前`
  if (hours > 0)
    return `${hours} 小时前`
  if (minutes > 0)
    return `${minutes} 分钟前`
  return '刚刚'
}

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名（小写）
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, limit = 300) {
  let inThrottle = false
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * 高亮文本中的关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 要高亮的关键词
 * @returns {Array<{text: string, highlight: boolean}>} 分段数组
 */
export function highlightText(text, keyword) {
  if (!keyword || !text) {
    return [{ text, highlight: false }]
  }

  // 转义正则特殊字符
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return parts.filter(Boolean).map(part => ({
    text: part,
    highlight: part.toLowerCase() === keyword.toLowerCase(),
  }))
}

/**
 * 获取显示用的文件名（去除分类前缀）
 * @param {string} filename - 原始文件名，格式：分类--名称.扩展名
 * @returns {string} 显示名称，格式：名称.扩展名
 * @example
 * getDisplayFilename('动漫--刀剑神域_亚丝娜.jpg') // '刀剑神域_亚丝娜.jpg'
 * getDisplayFilename('风景_山水.png') // '风景_山水.png' (无前缀时原样返回)
 */
export function getDisplayFilename(filename) {
  if (!filename)
    return ''
  const separator = '--'
  const index = filename.indexOf(separator)
  if (index === -1)
    return filename
  return filename.slice(index + separator.length)
}

/**
 * 下载文件
 * @param {string} url - 文件 URL
 * @param {string} filename - 保存的文件名
 */
export async function downloadFile(url, filename) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }
  catch {
    // 降级方案：直接打开链接
    window.open(url, '_blank')
  }
}
