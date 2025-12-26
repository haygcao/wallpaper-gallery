# CDN 优化建议方案

## 当前 CDN 配置分析

### 使用的 CDN（index.html）
```javascript
"vue": "https://cdn.jsdelivr.net/npm/vue@3.5.24/dist/vue.esm-browser.prod.js"
"vue-router": "https://cdn.jsdelivr.net/npm/vue-router@4.6.4/dist/vue-router.esm-browser.js"
"gsap": "https://cdn.jsdelivr.net/npm/gsap@3.14.2/index.js"
```

### 优缺点分析

**优点**：
- ✅ jsdelivr 全球 CDN 加速
- ✅ 自动缓存，减少服务器负载
- ✅ 减小打包体积（约 300KB）

**缺点**：
- ⚠️ 国内访问速度不稳定（jsdelivr 在国内有时被墙）
- ⚠️ 单点故障风险（CDN 挂了，网站无法使用）
- ⚠️ 没有降级方案

---

## 优化方案对比

### 方案 1：国内 CDN 替代（推荐）

**使用国内稳定的 CDN**：

```html
<!-- 推荐：使用 unpkg.com（Cloudflare CDN，国内访问稳定） -->
<script type="importmap">
{
  "imports": {
    "vue": "https://unpkg.com/vue@3.5.24/dist/vue.esm-browser.prod.js",
    "vue-router": "https://unpkg.com/vue-router@4.6.4/dist/vue-router.esm-browser.js",
    "gsap": "https://unpkg.com/gsap@3.14.2/index.js"
  }
}
</script>
```

**优点**：
- ✅ unpkg 由 Cloudflare 提供，国内访问稳定
- ✅ 自动 HTTPS
- ✅ 支持版本锁定

**缺点**：
- ⚠️ 仍有单点故障风险

---

### 方案 2：CDN 降级方案（最佳）

**实现思路**：先尝试 CDN，失败则加载本地打包文件

```html
<!-- index.html -->
<script type="importmap">
{
  "imports": {
    "vue": "https://unpkg.com/vue@3.5.24/dist/vue.esm-browser.prod.js",
    "vue-router": "https://unpkg.com/vue-router@4.6.4/dist/vue-router.esm-browser.js",
    "gsap": "https://unpkg.com/gsap@3.14.2/index.js"
  }
}
</script>

<!-- CDN 失败检测和降级 -->
<script type="module">
// 检测 CDN 是否加载成功
const cdnLoadTimeout = 5000 // 5秒超时

Promise.race([
  import('vue'),
  new Promise((_, reject) => setTimeout(() => reject(new Error('CDN timeout')), cdnLoadTimeout))
]).catch(() => {
  // CDN 失败，重写 Import Map 使用本地文件
  console.warn('CDN 加载失败，切换到本地资源')

  const importMap = document.querySelector('script[type="importmap"]')
  importMap.textContent = JSON.stringify({
    imports: {
      'vue': '/assets/vendor/vue.esm-browser.prod.js',
      'vue-router': '/assets/vendor/vue-router.esm-browser.js',
      'gsap': '/assets/vendor/gsap.js'
    }
  })

  // 重新加载应用
  location.reload()
})
</script>
```

**vite.config.js 配置**：
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      // 开发环境和 CDN 失败时，打包这些库
      external: process.env.NODE_ENV === 'production' ? [] : ['vue', 'vue-router', 'gsap'],
      output: {
        // 备用本地文件
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'gsap-vendor': ['gsap'],
        },
      },
    },
  },
})
```

**优点**：
- ✅ CDN 正常时享受加速
- ✅ CDN 失败时自动降级到本地
- ✅ 可靠性最高

**缺点**：
- ⚠️ 需要打包备用文件，增加约 300KB
- ⚠️ 实现复杂度较高

---

### 方案 3：完全本地打包（保守）

**移除 CDN，所有依赖本地打包**

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      external: [], // 不使用外部 CDN
    },
  },
})
```

**优点**：
- ✅ 无 CDN 依赖，完全可控
- ✅ 国内访问稳定

**缺点**：
- ❌ 打包体积增加 ~300KB
- ❌ 失去 CDN 缓存优势
- ❌ 首次加载变慢

---

### 方案 4：智能 CDN 选择（高级）

**根据用户网络环境自动选择 CDN**

```javascript
// 检测用户网络环境
async function detectBestCDN() {
  const cdns = [
    { name: 'unpkg', base: 'https://unpkg.com' },
    { name: 'jsdelivr', base: 'https://cdn.jsdelivr.net/npm' },
    { name: 'local', base: '/assets/vendor' }
  ]

  for (const cdn of cdns) {
    try {
      const response = await fetch(`${cdn.base}/vue@3.5.24/package.json`, {
        method: 'HEAD',
        timeout: 3000
      })
      if (response.ok) {
        console.log(`使用 CDN: ${cdn.name}`)
        return cdn
      }
    } catch (error) {
      console.warn(`CDN ${cdn.name} 不可用`)
    }
  }

  return cdns[cdns.length - 1] // 降级到本地
}

// 动态设置 Import Map
const bestCDN = await detectBestCDN()
// ... 设置 Import Map
```

---

## 推荐实施方案

### 阶段 1：立即优化（简单）

**更换为 unpkg CDN**（国内更稳定）：

```diff
<!-- index.html -->
<script type="importmap">
{
  "imports": {
-   "vue": "https://cdn.jsdelivr.net/npm/vue@3.5.24/dist/vue.esm-browser.prod.js",
+   "vue": "https://unpkg.com/vue@3.5.24/dist/vue.esm-browser.prod.js",
-   "vue-router": "https://cdn.jsdelivr.net/npm/vue-router@4.6.4/dist/vue-router.esm-browser.js",
+   "vue-router": "https://unpkg.com/vue-router@4.6.4/dist/vue-router.esm-browser.js",
-   "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.14.2/index.js"
+   "gsap": "https://unpkg.com/gsap@3.14.2/index.js"
  }
}
</script>
```

**预计收益**：
- 国内访问速度提升 30-50%
- 降低 CDN 被墙风险

---

### 阶段 2：中期优化（推荐）

**添加多 CDN 降级机制**

1. 创建 `public/cdn-fallback.js`
2. 实现 CDN 检测和降级逻辑
3. 在 index.html 中引入

**预计收益**：
- 可靠性提升 95%+
- 用户体验提升（避免白屏）

---

### 阶段 3：长期优化（可选）

**使用自己的 CDN**

如果未来流量增大，可以考虑：
1. 使用 Cloudflare CDN（免费）
2. 将常用库托管到自己的域名
3. 配置缓存策略

**示例**：
```
https://cdn.061129.xyz/vue@3.5.24/vue.esm-browser.prod.js
```

---

## 其他 CDN 选项对比

| CDN | 国内速度 | 稳定性 | 缓存 | 备注 |
|-----|---------|--------|------|------|
| **unpkg** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Cloudflare，推荐 |
| **jsdelivr** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | 国内有时被墙 |
| **cdnjs** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | Cloudflare |
| **bootcdn** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | 国内 CDN，库较旧 |
| **本地打包** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | 最稳定，体积大 |

---

## 总结

**当前状态**：使用 jsdelivr CDN（国内不稳定）

**推荐方案**：
1. **立即行动**：切换到 unpkg（5 分钟）
2. **可选优化**：添加 CDN 降级（1 小时）
3. **未来考虑**：自建 CDN（根据流量决定）

**核心原则**：
- ✅ 继续使用公网 CDN（有自定义域名并不影响使用 CDN）
- ✅ 选择国内访问稳定的 CDN
- ✅ 添加降级方案提高可靠性

---

**最后更新**：2025-12-26
