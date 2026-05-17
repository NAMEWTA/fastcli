# @pierre/diffs — Vanilla JS API 完整参考

适用于 Vue / Svelte / Solid / Angular / 原生 DOM 等非 React 环境，或需要精细控制组件生命周期的场景。

## 目录

- [核心组件](#核心组件)
- [FileDiff](#filediff)
- [File](#file)
- [UnresolvedFile](#unresolvedfile)
- [Virtualizer 系列](#virtualizer-系列)
- [Worker Pool（Vanilla）](#worker-poolvanilla)
- [低级渲染器](#低级渲染器)
- [典型框架集成](#典型框架集成)

## 核心组件

```ts
import {
  FileDiff,
  File,
  UnresolvedFile,
  Virtualizer,
  VirtualizedFileDiff,
  VirtualizedFile,
  // 低级渲染器（仅高级用法）
  DiffHunksRenderer,
  FileRenderer,
} from '@pierre/diffs'
```

每个 Vanilla 组件遵循相同的生命周期约定：

```
new XxxComponent(options) → component.element → component.update(opts) → component.destroy()
```

## FileDiff

```ts
import { FileDiff, parseDiffFromFile } from '@pierre/diffs'

const oldFile = { filename: 'app.css', contents: oldCss }
const newFile = { filename: 'app.css', contents: newCss }

const fileDiff = new FileDiff({
  // 输入二选一
  oldFile,
  newFile,
  // 或：fileDiff: parseDiffFromFile(oldFile, newFile),

  // 显示选项（与 React 同义）
  theme: 'pierre-dark',
  layout: 'split',
  lineDiffType: 'word',
  changeStyle: 'bars',
  showLineNumbers: true,
  wrapLines: false,
  collapsed: false,
  hunkSeparators: 'line-info',
  useTokenTransformer: false,
  unsafeCSS: '',

  // Header 自定义（接收 fileDiff，返回 HTMLElement）
  renderHeaderPrefix: (fd) => {
    const el = document.createElement('span')
    el.textContent = '📁'
    return el
  },
  renderCustomHeader: (fd) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'my-header'
    wrapper.textContent = fd.filename
    return wrapper
  },

  // Annotations
  annotations: [
    { line: 5, side: 'right', render: () => buildCommentEl() },
  ],

  // Token hooks
  onTokenEnter: ({ tokenText, tokenElement }) => showTooltip(tokenElement, tokenText),
  onTokenLeave: () => hideTooltip(),
  onTokenClick: ({ tokenText }) => navigateToSymbol(tokenText),
})

// 挂载
document.querySelector('#diff-container')!.appendChild(fileDiff.element)

// 更新选项（增量、不重建 DOM）
fileDiff.update({ collapsed: true })
fileDiff.update({ theme: 'pierre-light' })

// 销毁（释放 Shiki 资源、移除 DOM）
fileDiff.destroy()
```

### Annotations 渲染函数

Vanilla 中 `render: () => HTMLElement`，每次状态变化时调用：

```ts
function buildCommentEl(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'pr-comment'
  el.innerHTML = `
    <div class="comment-author">${escape(comment.author)}</div>
    <div class="comment-body">${escape(comment.body)}</div>
  `
  el.querySelector('.reply-btn')?.addEventListener('click', handleReply)
  return el
}
```

## File

```ts
import { File } from '@pierre/diffs'

const fileComp = new File({
  file: { filename: 'README.md', contents: markdownText },
  theme: 'pierre-light',
  wrapLines: true,
  showLineNumbers: true,
  annotations: [{ line: 10, side: 'right', render: () => createNoteEl() }],
})

document.body.appendChild(fileComp.element)
fileComp.update({ wrapLines: false })
fileComp.destroy()
```

## UnresolvedFile

```ts
import { UnresolvedFile } from '@pierre/diffs'

const conflict = new UnresolvedFile({
  file: { filename: 'config.ts', contents: conflictedSource },
  theme: 'pierre-dark',
  onResolve: (resolvedContents: string) => save('config.ts', resolvedContents),
})

container.appendChild(conflict.element)

// 用户处理过程中可订阅当前状态
conflict.onChange?.((state) => {
  // state 包含 unresolvedHunks 数量等信息
  updateProgressBar(state)
})

// 重置（注意：Vanilla 没有 React 的 key，直接销毁重建）
conflict.destroy()
const fresh = new UnresolvedFile({ /* 同上 */ })
container.appendChild(fresh.element)
```

更多冲突解决策略见 [accept-reject-and-conflicts.md](./accept-reject-and-conflicts.md)。

## Virtualizer 系列

```ts
import { Virtualizer, VirtualizedFileDiff, VirtualizedFile } from '@pierre/diffs'

// 1. 创建虚拟化容器
const virtualizer = new Virtualizer({
  scrollRoot: document.querySelector('#scroll-root')!,
  contentWrapper: document.querySelector('#content')!,
  config: {
    overscrollSize: 200,                    // 屏外预渲染缓冲（px）
    intersectionObserverMargin: '200px',
  },
})

// 2. 创建虚拟化 diff
const vDiff = new VirtualizedFileDiff({
  fileDiff: parseDiffFromFile(oldFile, newFile),
  theme: 'pierre-dark',
  virtualizer,                              // 关键：传入 virtualizer 实例
  metrics: {
    lineHeight: 20,
    headerHeight: 44,
  },
})

document.querySelector('#content')!.appendChild(vDiff.element)

// 多个文件共享同一个 virtualizer
diffs.forEach(diff => {
  const v = new VirtualizedFileDiff({ fileDiff: diff, virtualizer, theme: 'pierre-dark' })
  document.querySelector('#content')!.appendChild(v.element)
})

// 销毁顺序：先 destroy 各 vDiff，再 destroy virtualizer
vDiff.destroy()
virtualizer.destroy()
```

虚拟化的工作原理与配合 Worker Pool 的最佳实践见 [advanced-rendering.md](./advanced-rendering.md)。

## Worker Pool（Vanilla）

把 Shiki 高亮移至后台 Worker 线程：

```ts
import { getOrCreateWorkerPoolSingleton, terminateWorkerPoolSingleton } from '@pierre/diffs/worker'
import { FileDiff } from '@pierre/diffs'

const workerFactory = () => new Worker(
  new URL('@pierre/diffs/worker', import.meta.url),
  { type: 'module' }
)

const pool = getOrCreateWorkerPoolSingleton(workerFactory, {
  workerCount: 2,
  theme: 'pierre-dark',
  useTokenTransformer: false,
})

// 第二参数传入 pool（注意：组件内传的同名选项会被忽略）
const fileDiff = new FileDiff({ oldFile, newFile }, pool)
container.appendChild(fileDiff.element)

// 动态切换主题（覆盖整个 Pool 渲染的所有 diff）
pool.setRenderOptions({ theme: 'pierre-light' })

// SPA 路由清理（可选，下次 get 会重新创建）
terminateWorkerPoolSingleton()
```

## 低级渲染器

绕过组件层，直接获取 HAST（HTML AST），用于自定义渲染管道、SSR 字符串拼接等高级场景。

```ts
import { DiffHunksRenderer, FileRenderer, parseDiffFromFile } from '@pierre/diffs'

// Diff 渲染器
const diffRenderer = new DiffHunksRenderer({
  fileDiff: parseDiffFromFile(oldFile, newFile),
  theme: 'pierre-dark',
  lineDiffType: 'word',
})
const diffHast = await diffRenderer.render()
// diffHast 是 HAST 树，可用 hast-util-to-html / unified 输出 HTML 字符串

// 单文件渲染器
const fileRenderer = new FileRenderer({
  file: { filename: 'index.ts', contents: code },
  theme: 'pierre-dark',
})
const fileHast = await fileRenderer.render()
```

返回的 HAST 兼容 unified/rehype 生态，可被进一步插件化处理（添加属性、过滤节点等）。

## 典型框架集成

### Vue 3 组合式 API

```vue
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { FileDiff } from '@pierre/diffs'

const props = defineProps<{ oldFile: FileContents; newFile: FileContents }>()
const containerRef = ref<HTMLElement>()
let instance: FileDiff | null = null

watch([containerRef, () => props.oldFile, () => props.newFile], () => {
  if (!containerRef.value) return
  instance?.destroy()
  instance = new FileDiff({
    oldFile: props.oldFile,
    newFile: props.newFile,
    theme: 'pierre-dark',
  })
  containerRef.value.appendChild(instance.element)
}, { immediate: true })

onUnmounted(() => instance?.destroy())
</script>

<template>
  <div ref="containerRef" />
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { FileDiff } from '@pierre/diffs'

  export let oldFile, newFile

  let container: HTMLElement
  let instance: FileDiff | null = null

  onMount(() => {
    instance = new FileDiff({ oldFile, newFile, theme: 'pierre-dark' })
    container.appendChild(instance.element)
  })

  onDestroy(() => instance?.destroy())
</script>

<div bind:this={container} />
```

### 原生 DOM（无框架）

```ts
import { FileDiff } from '@pierre/diffs'

class DiffWidget {
  private instance: FileDiff | null = null

  constructor(private container: HTMLElement) {}

  show(oldFile: FileContents, newFile: FileContents) {
    this.instance?.destroy()
    this.instance = new FileDiff({ oldFile, newFile, theme: 'pierre-dark' })
    this.container.replaceChildren(this.instance.element)
  }

  setTheme(theme: string) {
    this.instance?.update({ theme })
  }

  dispose() {
    this.instance?.destroy()
    this.instance = null
  }
}
```

## 销毁清单（避免内存泄漏）

| 资源 | 释放方式 |
|---|---|
| `FileDiff` / `File` / `UnresolvedFile` 实例 | `instance.destroy()` |
| `Virtualizer` | 先销毁所有依赖它的虚拟化组件，再 `virtualizer.destroy()` |
| Worker Pool | `terminateWorkerPoolSingleton()`（SPA 路由切换可选） |
| Shiki 全局高亮器 | `disposeHighlighter()`（仅在确定不再使用时） |

SPA 中常见模式：组件 unmount → `instance.destroy()`，但保留 Shiki 高亮器（下次创建组件可复用）。
