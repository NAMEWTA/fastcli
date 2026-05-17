# 故障排查与调试

按现象分组的排查清单。每条都给出根因 + 验证步骤 + 修复方案。

## 目录

- [Diffs：渲染与高亮问题](#diffs渲染与高亮问题)
- [Diffs：性能问题](#diffs性能问题)
- [Diffs：样式与主题问题](#diffs样式与主题问题)
- [Trees：状态不同步](#trees状态不同步)
- [Trees：SSR Hydration 问题](#treesssr-hydration-问题)
- [Trees：交互问题](#trees交互问题)
- [打包与构建](#打包与构建)
- [调试工具与技巧](#调试工具与技巧)

## Diffs：渲染与高亮问题

### 现象 1：语法高亮不生效，显示纯文本

**可能原因**：

- Shiki 异步初始化，首次渲染未及时着色
- 文件名扩展名未被识别（如 `Dockerfile`、自定义 DSL）
- 主题或语言尚未注册

**验证**：

```ts
// 浏览器控制台
console.log(await import('@pierre/diffs').then(m => m.getSharedHighlighter()))
```

**修复**：

```ts
// 路由层提前预加载
import { preloadHighlighter, setLanguageOverride } from '@pierre/diffs'

await preloadHighlighter({
  themes: ['pierre-dark'],
  langs: ['typescript', 'tsx', 'javascript', 'jsx', 'python', 'rust', 'go'],
})

// 强制指定语言（适用于无扩展名文件）
const file = setLanguageOverride({ filename: 'Dockerfile', contents }, 'dockerfile')
```

### 现象 2：快速挂载/卸载导致高亮停摆

**根因**：已知 Bug #337 —— 短时间内多次创建销毁 `FileDiff` 时，Shiki 实例状态损坏。

**验证**：在 1 秒内连续切换 5 次 diff 文件，观察是否出现纯文本。

**修复**：启用 Worker Pool。Worker 线程内的高亮器有独立生命周期，不受组件挂载/卸载影响。

```tsx
<WorkerPoolContextProvider workerFactory={...} options={{ workerCount: 2, theme: 'pierre-dark' }}>
  <App />
</WorkerPoolContextProvider>
```

### 现象 3：分屏布局（split）在 Safari 下卡顿

**根因**：v1.0 的 DOM 结构在 Safari 上有性能瓶颈，已在 v1.1 修复。

**修复**：升级到 `@pierre/diffs >= 1.1.0`。

```bash
bun add @pierre/diffs@latest
```

### 现象 4：Diff 中文 / Emoji 显示为 box

**根因**：使用了不含 CJK / Emoji 字形的等宽字体。

**修复**：在 `style` prop 提供回退字体链：

```tsx
<MultiFileDiff
  style={{
    fontFamily: 'JetBrains Mono, "Noto Sans Mono CJK SC", "Apple Color Emoji", monospace',
  }}
/>
```

## Diffs：性能问题

### 现象 1：单次渲染 > 1 秒

**诊断**：打开 DevTools Performance 录制，看 Long Task。

| 时长占比 | 瓶颈 | 修复 |
|---|---|---|
| Shiki tokenize | 高亮 | Worker Pool |
| Diff parse | 算法 | 文件过大，考虑分块 |
| DOM 写入 | 数据量 | 启用虚拟化 |

### 现象 2：滚动卡顿

**根因**：

- 同页 ≥ 20 个未虚拟化的 diff
- annotations 过多（数百个）
- 启用了 `useTokenTransformer: true` 但未启用虚拟化

**修复**：

```tsx
// 1. 用虚拟化包裹
<Virtualizer style={{ height: '100vh' }}>
  {diffs.map(d => <VirtualizedFileDiff key={d.id} fileDiff={d.fileDiff} />)}
</Virtualizer>

// 2. annotations 仅在视区附近渲染（结合 IntersectionObserver）
// 3. 关闭不必要的 useTokenTransformer
```

### 现象 3：内存持续增长

**根因**：组件卸载后未释放高亮器资源。

**修复**：

```ts
// SPA 路由切换时清理（可选）
import { disposeHighlighter, terminateWorkerPoolSingleton } from '@pierre/diffs/worker'

// 退出大型审查页面时
terminateWorkerPoolSingleton()
disposeHighlighter()
```

⚠️ 不要在每次组件卸载就调用——这些是全局共享资源，下一个组件会被迫重建。仅在确定不再使用时调用。

### 现象 4：Worker Pool 启动慢

**根因**：Worker bundle 体积过大，初次加载慢。

**修复**：

- 在路由 loader 中提前 `getOrCreateWorkerPoolSingleton`，让 Worker 在用户进入页面前就启动
- 检查打包配置，确保 Worker bundle 没把整个 `@pierre/diffs` 都打进去

## Diffs：样式与主题问题

### 现象 1：写在外部 CSS 的样式对 Diffs 无效

**根因**：Shadow DOM 隔离，外部 CSS 不穿透。

**修复**：用以下三种方式之一：

```tsx
// A. style prop
<MultiFileDiff style={{ fontFamily: 'JetBrains Mono', '--diffs-add-bg': '#0a3' }} />

// B. unsafeCSS
<MultiFileDiff options={{ unsafeCSS: '[data-diffs-line][data-type="add"] { background: #0a3 }' }} />

// C. 自定义主题
import { registerCustomTheme } from '@pierre/diffs'
registerCustomTheme(myTheme)
```

详见 [theming-and-shadow-dom.md](./theming-and-shadow-dom.md)。

### 现象 2：unsafeCSS 写了但选择器没匹配

**调试**：

1. 浏览器开发工具，找到 `<pierre-diff>` 元素
2. 展开 `#shadow-root (open)`
3. 用元素检查器查看实际的 data 属性

```css
/* 错：可能依赖结构 */
.diff-container > div > div:nth-child(2)

/* 对：用稳定的 data 属性 */
[data-diffs-line][data-type="add"]
```

### 现象 3：主题切换闪屏

**根因**：切换瞬间所有 diff 重新高亮，主线程被 Shiki 占满。

**修复**：

- 启用 Worker Pool
- 结合 `cacheKey`（同内容只高亮一次）
- 切换瞬间显示 `LoadingOverlay`

```tsx
function ThemedDiffs({ theme }) {
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    setTransitioning(true)
    const t = setTimeout(() => setTransitioning(false), 200)
    return () => clearTimeout(t)
  }, [theme])

  return (
    <div style={{ position: 'relative' }}>
      {transitioning && <LoadingOverlay visible />}
      <MultiFileDiff options={{ theme }} {...} />
    </div>
  )
}
```

### 现象 4：CM6 与 Diffs 行高不一致

**根因**：两者来自不同 DOM 上下文，CSS 默认值可能不同。

**修复**：通过共享变量统一：

```css
:root {
  --code-line-height: 20px;
}
```

```ts
// CM6
EditorView.theme({ '.cm-content': { lineHeight: 'var(--code-line-height)' } })

// Diffs
<MultiFileDiff style={{ lineHeight: 'var(--code-line-height)' }} />
```

## Trees：状态不同步

### 现象 1：传给 useFileTree 的 paths 变了，但树没更新

**根因**：`useFileTree` 是 **uncontrolled** 的，初始化后不再监听选项变化。

**修复**：用 model 命令式方法：

```tsx
// ❌ 不会触发更新
useFileTree({ paths: latestPaths })

// ✅ 用 useEffect 调用 model
useEffect(() => {
  model.resetPaths(latestPaths)
}, [latestPaths])

useEffect(() => {
  model.setGitStatus(latestGitStatus)
}, [latestGitStatus])

useEffect(() => {
  model.setIcons(latestIconConfig)
}, [latestIconConfig])
```

### 现象 2：单条选中变化没触发组件更新

**根因**：用了 `useFileTreeSelector` 但 selector 返回新对象（数组/对象）。

**修复**：返回原始值或稳定引用：

```tsx
// ❌ 每次都返回新对象，浅比较失败
const x = useFileTreeSelector(model, s => ({ focused: s.focusedPath, selected: s.selectedPaths }))

// ✅ 单值
const focused = useFileTreeSelector(model, s => s.focusedPath)
const selected = useFileTreeSelection(model)   // 内部已优化
```

### 现象 3：拖拽完成后 Tree 没刷新到新结构

**根因**：`onDropComplete` 只是回调，自己负责持久化；不会自动改 Tree 状态。

**修复**：在回调里调用 `model.batch`：

```tsx
dragAndDrop: {
  onDropComplete: async (event) => {
    await api.moveFile(event.draggedPaths, event.targetPath)
    model.batch(event.draggedPaths.map(p => ({
      type: 'move',
      fromPath: p,
      toPath: `${event.targetPath}/${basename(p)}`,
    })))
  },
}
```

## Trees：SSR Hydration 问题

### 现象 1：Hydration mismatch 警告

**根因**：服务端和客户端的 tree-defining 选项不一致。常见冲突点：

- `id` 不同
- `paths` 顺序不同（数组要稳定排序）
- `initialExpansion` 不同
- `gitStatus` 加载时机不同（服务端有、客户端首屏没有）
- `icons` 配置不同

**验证**：在 React DevTools 启用 strict mode，会精确指出 mismatch 节点。

**修复**：抽公共常量：

```ts
// lib/tree-config.ts
export const TREE_ID = 'main-file-tree'
export const TREE_DEFAULTS = {
  icons: 'standard' as const,
  density: 'default' as const,
  initialExpansion: 'all-expanded' as const,
  flattenEmptyDirectories: true,
}

export function buildTreeOptions(paths: string[], gitStatus: Record<string, string>) {
  return {
    paths: [...paths].sort(),                   // 稳定排序
    id: TREE_ID,
    gitStatus,
    ...TREE_DEFAULTS,
  }
}
```

### 现象 2：客户端渲染瞬间闪烁

**根因**：

- SSR HTML 是默认主题（无 CSS 变量），客户端 `style` prop 注入主题晚一帧
- gitStatus 服务端为空，客户端拉到后再 setGitStatus

**修复**：

- 主题 CSS 变量直接写在 HTML 的 `<style>` 标签里（critical CSS）
- `gitStatus` 在 SSR 阶段就 fetch 后传入 `preloadFileTree`

## Trees：交互问题

### 现象 1：键盘方向键不工作

**根因**：Trees 容器没有焦点，键盘事件没派发到它。

**修复**：

```tsx
<FileTree
  model={model}
  tabIndex={0}                        // 必需
  style={{ outline: 'none' }}         // 可选：去掉默认聚焦框
/>
```

### 现象 2：触摸设备拖拽无效

**根因**：当前基于 HTML5 DnD API，触摸支持有限。

**临时方案**：

- 长按弹出菜单替代拖拽
- 用 `model.startRenaming` + 手动改路径模拟移动
- 等待官方更新（关注 GitHub Issues）

```tsx
// 长按菜单替代
<FileTree
  model={model}
  renderContextMenu={(item) => (
    <Menu>
      <Menu.Item onClick={() => promptMovePath(item)}>移动到...</Menu.Item>
      <Menu.Item onClick={() => model.startRenaming(item.path)}>重命名</Menu.Item>
    </Menu>
  )}
/>
```

### 现象 3：搜索匹配后焦点跳走

**根因**：默认行为是聚焦第一个匹配项。

**修复**：

```ts
// 自己控制焦点
model.setSearch(query)                      // 不显示 UI，仅过滤
// 不调用 focusNextSearchMatch
```

### 现象 4：renderRowDecoration 渲染了但不显示

**根因**：返回的 HTML 字符串包含被 sanitize 过滤的元素或属性。

**验证**：

```tsx
renderRowDecoration: (item) => {
  const html = '<span>test</span>'
  console.log('returning:', html)
  return html
}
```

**修复**：

- 只用基础 HTML 标签和 class
- 颜色用 CSS class，不要内联 `style`（部分版本会过滤）

```tsx
// 推荐：CSS class
renderRowDecoration: (item) => `<span class="badge-gen">gen</span>`
```

```css
.badge-gen {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--mantine-color-yellow-2);
  border-radius: 4px;
}
```

## 打包与构建

### 现象 1：Worker URL 解析失败

**根因**：打包工具未识别 `new URL('@pierre/diffs/worker', import.meta.url)`。

**修复（按打包工具）**：

```ts
// Vite：开箱即用
const workerFactory = () => new Worker(
  new URL('@pierre/diffs/worker', import.meta.url),
  { type: 'module' }
)

// Webpack 5：开箱即用（同上）

// Next.js (App Router)：开箱即用（同上）

// 旧打包器或 SSR-only 环境：考虑使用 worker-loader 或预构建 worker bundle
```

### 现象 2：CSS 没引入导致 Diff 显示破碎

**根因**：Diffs 默认样式包含在 Shadow DOM 内，**不需要**外部引入。如果显示破碎，多半是 CSP 或 Shadow DOM polyfill 问题。

**验证**：开发工具看 `<pierre-diff>` 是否有 `#shadow-root`。

### 现象 3：SSR 报错 `window is not defined`

**根因**：从客户端入口（`@pierre/diffs/react`）在服务端模块树中被引入。

**修复**：

```tsx
// Next.js App Router
'use client'                          // 必需

import { MultiFileDiff } from '@pierre/diffs/react'
```

```ts
// 服务端只用 SSR 入口
import { preloadMultiFileDiff } from '@pierre/diffs/ssr'      // ✓ 服务端安全
import { MultiFileDiff } from '@pierre/diffs/react'           // ✗ 在 RSC 中会报错
```

## 调试工具与技巧

### 1. Diff 元数据检查

```ts
import { parseDiffFromFile } from '@pierre/diffs'

const diff = parseDiffFromFile(oldFile, newFile)
console.table(diff.hunks.map(h => ({
  oldStart: h.oldStart,
  oldLines: h.oldLines,
  newStart: h.newStart,
  newLines: h.newLines,
  changes: h.changes?.length,
})))
```

### 2. Tree 状态快照

```ts
// 订阅每次变化，打印关键状态
const unsub = tree.subscribe(() => {
  console.log({
    selected: tree.getSelectedPaths(),
    focused: tree.getFocusedPath(),
    matches: tree.getSearchMatchingPaths().length,
  })
})

// 调试结束记得 unsub()
```

### 3. Worker Pool 健康检查

```ts
import { getOrCreateWorkerPoolSingleton } from '@pierre/diffs/worker'

const pool = getOrCreateWorkerPoolSingleton(workerFactory, options)
console.log('worker count:', pool.getWorkerCount?.())
console.log('cache size:',   pool.getCacheSize?.())
```

> 具体方法以版本为准，不存在的字段降级为打印 `pool` 对象。

### 4. 性能录制最小复现

```html
<!doctype html>
<html>
<body>
<div id="root"></div>
<script type="module">
  import { FileDiff, parseDiffFromFile } from 'https://esm.sh/@pierre/diffs'

  // 构造大文件
  const oldText = Array.from({ length: 5000 }, (_, i) => `const a${i} = ${i}`).join('\n')
  const newText = Array.from({ length: 5000 }, (_, i) => `const a${i} = ${i * 2}`).join('\n')

  const t0 = performance.now()
  const diff = parseDiffFromFile(
    { filename: 'a.ts', contents: oldText },
    { filename: 'a.ts', contents: newText },
  )
  console.log('parse:', performance.now() - t0, 'ms')

  const t1 = performance.now()
  const widget = new FileDiff({ fileDiff: diff, theme: 'pierre-dark' })
  document.querySelector('#root').appendChild(widget.element)
  console.log('mount:', performance.now() - t1, 'ms')
</script>
</body>
</html>
```

### 5. 上报 Issue 的最小信息清单

向 GitHub Issues 或 Discord 提问时附带：

- `@pierre/diffs` 与 `@pierre/trees` 版本（`pnpm list @pierre/*`）
- 浏览器 + 操作系统
- React / 框架版本
- 可复现的最小代码片段（Stackblitz / CodeSandbox）
- DevTools Performance 截图（性能问题）
- 控制台报错（含完整堆栈）

## 已知限制清单

| 限制 | 影响 | 状态 |
|---|---|---|
| 触摸设备 DnD 支持有限 | Trees 拖拽 | 等官方更新 |
| 快速挂载/卸载导致高亮异常（v1.0） | Diffs | v1.1 已修复，需启用 Worker Pool 或升级 |
| Safari 分屏性能（v1.0） | Diffs split | v1.1 已修复 |
| Worker Pool 下组件级 theme 被忽略 | Diffs | 设计如此，用 Provider 切换 |
| 渲染缓存依赖 Worker Pool | Diffs | 设计如此 |

## 求助渠道

| 渠道 | 适合 |
|---|---|
| https://diffs.com/playground | 在线复现问题 |
| https://github.com/pierrecomputer/pierre/issues | Bug 上报 |
| https://discord.gg/pierre | 即时讨论 |
| https://diffs.com/docs / https://trees.software/docs | 官方文档查询 |
