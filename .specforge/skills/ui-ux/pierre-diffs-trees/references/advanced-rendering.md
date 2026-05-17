# 高级渲染：虚拟化、Worker Pool、缓存与 SSR

本文档覆盖 Pierre Diffs/Trees 的性能调优能力。所有技巧的应用顺序：**预加载 → 虚拟化 → 缓存 → Worker Pool → SSR**。

## 目录

- [何时启用什么](#何时启用什么)
- [虚拟化（Virtualization）](#虚拟化virtualization)
- [Worker Pool](#worker-pool)
- [渲染缓存（cacheKey）](#渲染缓存cachekey)
- [SSR：Diffs](#ssrdiffs)
- [SSR：Trees](#ssrtrees)
- [组合策略](#组合策略)

## 何时启用什么

| 数据规模 | 预加载 | 虚拟化 | 缓存 | Worker Pool | SSR |
|---|---|---|---|---|---|
| 单 diff < 500 行 | 可选 | ✗ | ✗ | ✗ | 可选 |
| 单 diff 500–5000 行 | ✓ | ✗ | ✗ | ✗ | ✓ |
| 同页 5–20 文件 | ✓ | ✗ | ✓ | 可选 | ✓ |
| 同页 20–100 文件 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 大文件（≥ 5000 行）+ 多文件 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 文件树 < 500 路径 | — | 内置 | — | — | 可选 |
| 文件树 ≥ 500 路径 | — | 内置 | — | — | ✓（必备） |

## 虚拟化（Virtualization）

### React 用法

```tsx
import { Virtualizer, VirtualizedFileDiff, VirtualizedFile } from '@pierre/diffs/react'

<Virtualizer
  style={{ height: '80vh', overflow: 'auto' }}
  config={{
    overscrollSize: 200,                         // 屏外预渲染缓冲（px）
    intersectionObserverMargin: '200px',
  }}
>
  {diffs.map(d => (
    <VirtualizedFileDiff
      key={d.fileDiff.filename}
      fileDiff={d.fileDiff}
      options={{ theme: 'pierre-dark' }}
      metrics={{
        // 与实际布局匹配，提高首屏估算精度
        lineHeight: 20,
        headerHeight: 44,
      }}
    />
  ))}
</Virtualizer>
```

**关键约束**：

- `<Virtualizer>` 必须有显式 `height`，否则虚拟化无法计算视区
- `metrics` 不需要精确，估算值即可（首屏后会自动测量并修正）
- 同页放多个 `<Virtualizer>` 时各自独立工作

### Vanilla 用法

```ts
import { Virtualizer, VirtualizedFileDiff } from '@pierre/diffs'

const virtualizer = new Virtualizer({
  scrollRoot: document.querySelector('#scroll-root')!,
  contentWrapper: document.querySelector('#content')!,
  config: { overscrollSize: 200 },
})

diffs.forEach(d => {
  const v = new VirtualizedFileDiff({
    fileDiff: d,
    theme: 'pierre-dark',
    virtualizer,                                  // 传入 virtualizer 实例
    metrics: { lineHeight: 20, headerHeight: 44 },
  })
  document.querySelector('#content')!.appendChild(v.element)
})

// 销毁顺序：先各 vDiff，再 virtualizer
```

### 虚拟化的工作机制

1. 容器使用 IntersectionObserver 监测每个 diff 是否进入视区
2. 进入视区前 `intersectionObserverMargin` 距离时，开始渲染
3. 离开视区后保留一段时间（避免来回滚动重建），再卸载内容
4. 不在视区的 diff 仅保留占位高度（用 `metrics` 估算）

### VirtualizedFile（无 diff 单文件）

```tsx
import { VirtualizedFile } from '@pierre/diffs/react'

<Virtualizer style={{ height: '100vh' }}>
  {files.map(f => (
    <VirtualizedFile
      key={f.filename}
      file={f}
      options={{ theme: 'pierre-dark' }}
      metrics={{ lineHeight: 20, headerHeight: 44 }}
    />
  ))}
</Virtualizer>
```

适合代码搜索结果、文件浏览页等批量单文件渲染场景。

## Worker Pool

把 Shiki 高亮移至后台 Worker 线程，主线程不再阻塞，配合虚拟化提升大量 diff 的滚动流畅度。

### React 用法

```tsx
import { WorkerPoolContextProvider } from '@pierre/diffs/react'

const workerFactory = () => new Worker(
  new URL('@pierre/diffs/worker', import.meta.url),
  { type: 'module' }
)

<WorkerPoolContextProvider
  workerFactory={workerFactory}
  options={{
    workerCount: 2,                  // 默认 2，CPU 核多可调高（4 核以上设 4）
    theme: 'pierre-dark',            // ⚠️ 主题在 Pool 级别统一控制
    useTokenTransformer: false,      // 同上，组件级别会被忽略
  }}
>
  <App />
</WorkerPoolContextProvider>
```

⚠️ Worker Pool 激活时，`theme` / `lineDiffType` / `useTokenTransformer` **由 Pool 统一控制**，组件级别传入的同名选项**会被忽略**。需要切换主题：

```tsx
// 通过 Provider 重渲染（推荐）
<WorkerPoolContextProvider options={{ theme: currentTheme }}>...</WorkerPoolContextProvider>

// 或调用 Pool 实例方法（高级）
const pool = useWorkerPool()         // 假设暴露了该 hook
pool?.setRenderOptions({ theme: 'pierre-light' })
```

### Vanilla 用法

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
})

// 第二参数传入 pool
const fileDiff = new FileDiff({ oldFile, newFile }, pool)

// 主题切换（影响所有由 pool 渲染的 diff）
pool.setRenderOptions({ theme: 'pierre-light' })

// SPA 路由清理
terminateWorkerPoolSingleton()
```

### 配合虚拟化的最佳实践

```tsx
<WorkerPoolContextProvider workerFactory={workerFactory} options={{ workerCount: 4, theme }}>
  <Virtualizer style={{ height: '100vh' }}>
    {diffs.map(d => (
      <VirtualizedFileDiff key={d.id} fileDiff={d.fileDiff} />
    ))}
  </Virtualizer>
</WorkerPoolContextProvider>
```

- 虚拟化只渲染视区附近的 diff
- 视区内的高亮交给 Worker Pool，不阻塞主线程
- 切换主题时所有视区 diff 一致更新，已卸载的不参与

## 渲染缓存（cacheKey）

设置 `cacheKey` 后，相同内容（基于 cacheKey）不会被重复高亮。**仅在 Worker Pool 模式下生效**。

```ts
const oldFile = { filename: 'app.ts', contents: oldCode, cacheKey: 'sha:abc123' }
const newFile = { filename: 'app.ts', contents: newCode, cacheKey: 'sha:def456' }

// parseDiffFromFile 会自动组合 cacheKey 为 'sha:abc123:sha:def456'
const diff = parseDiffFromFile(oldFile, newFile)
```

### cacheKey 选取策略

| 场景 | cacheKey 取值 |
|---|---|
| Git 文件版本 | `${commitSha}:${filename}` |
| 用户编辑的草稿 | `${userId}:${draftId}:${revision}` |
| AI 提议的多个版本 | `${conversationId}:${suggestionId}` |
| 内容哈希（最稳） | `sha-256(contents)` |

### 注意

- `cacheKey` 不影响 diff 计算，只影响 Shiki 高亮缓存
- 不要使用文件名做 cacheKey（同名不同内容会拿到错误缓存）
- 缓存随 Worker Pool 生命周期，`terminateWorkerPoolSingleton` 后清空

## SSR：Diffs

服务端预渲染减少首屏 LCP，常见场景：PR 详情页、提交对比页。

### 服务端

```ts
import {
  preloadMultiFileDiff,
  preloadPatchDiff,
  preloadFile,
  preloadFileDiff,
  preloadPatchFile,           // 多文件 patch，返回数组
  preloadUnresolvedFile,
} from '@pierre/diffs/ssr'

// MultiFileDiff
const preloaded = await preloadMultiFileDiff({
  oldFile,
  newFile,
  options: { theme: 'pierre-dark', layout: 'split' },
})

// PatchDiff
const preloadedPatch = await preloadPatchDiff({
  patch: patchString,
  options: { theme: 'pierre-dark' },
})

// 多文件 patch（返回数组，每个文件一个 payload）
const preloadedFiles = await preloadPatchFile({
  patch: multiFilePatch,
  options: { theme: 'pierre-dark' },
})
```

### 客户端 React Hydration

```tsx
'use client'
import { MultiFileDiff } from '@pierre/diffs/react'

export function DiffView({ preloaded }) {
  // 直接 spread preloaded，React 自动 hydrate
  return <MultiFileDiff {...preloaded} />
}
```

### Next.js App Router 完整示例

```tsx
// app/pr/[id]/page.tsx (Server Component)
import { preloadMultiFileDiff } from '@pierre/diffs/ssr'
import { DiffView } from './diff-view'

export default async function PRPage({ params }) {
  const { oldFile, newFile } = await fetchPRFiles(params.id)
  const preloaded = await preloadMultiFileDiff({
    oldFile,
    newFile,
    options: { theme: 'pierre-dark' },
  })
  return <DiffView preloaded={preloaded} />
}
```

```tsx
// app/pr/[id]/diff-view.tsx
'use client'
import { MultiFileDiff } from '@pierre/diffs/react'

export function DiffView({ preloaded }) {
  return <MultiFileDiff {...preloaded} />
}
```

## SSR：Trees

### 服务端

```ts
import { preloadFileTree, serializeFileTreeSsrPayload } from '@pierre/trees/ssr'

const TREE_ID = 'main-file-tree'   // 统一常量

const payload = await preloadFileTree({
  paths: allPaths,
  id: TREE_ID,
  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
  gitStatus,
})

// 非 RSC：序列化嵌入页面
const html = serializeFileTreeSsrPayload(payload)
```

### 客户端 React

```tsx
'use client'
import { useFileTree, FileTree } from '@pierre/trees/react'

export function ClientTree({ paths, gitStatus, payload }) {
  const { model } = useFileTree({
    paths,
    id: 'main-file-tree',          // ⚠️ 必须与服务端一致
    icons: 'standard',
    density: 'default',
    initialExpansion: 'all-expanded',
    gitStatus,
  })

  return (
    <FileTree
      model={model}
      preloadedData={payload}
      style={{ height: '100%', width: 280 }}
    />
  )
}
```

### 客户端 Vanilla

```ts
import { FileTree } from '@pierre/trees'

const tree = new FileTree({
  paths: allPaths,
  id: 'main-file-tree',
  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
})

tree.hydrate({ fileTreeContainer: document.querySelector('#sidebar')! })
```

### Hydration Mismatch 防御

把 tree-defining 选项抽到共享常量：

```ts
// lib/tree-config.ts
export const TREE_ID = 'main-file-tree'
export const TREE_OPTIONS = {
  icons: 'standard' as const,
  density: 'default' as const,
  initialExpansion: 'all-expanded' as const,
  flattenEmptyDirectories: true,
}
```

```ts
// 服务端
const payload = await preloadFileTree({ paths, id: TREE_ID, ...TREE_OPTIONS, gitStatus })

// 客户端
const { model } = useFileTree({ paths, id: TREE_ID, ...TREE_OPTIONS, gitStatus })
```

## 组合策略

### 大型代码审查页面（推荐架构）

```
┌────────────────────────────────────────────────────────────┐
│  WorkerPoolContextProvider (theme, workerCount: 4)         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  <Virtualizer height="100vh">                       │   │
│  │    多个 <VirtualizedFileDiff> （每个带 cacheKey）   │   │
│  │  </Virtualizer>                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  服务端：preloadMultiFileDiff 返回所有文件 payload          │
└────────────────────────────────────────────────────────────┘
```

### IDE 风格双栏

```tsx
// 服务端预处理大型树 + 默认文件 diff
async function loader({ params }) {
  const allPaths = await fs.readdir(...)
  const preparedInput = prepareFileTreeInput(allPaths)
  const treePayload = await preloadFileTree({ paths: allPaths, id: TREE_ID })
  const diffPayload = params.file
    ? await preloadMultiFileDiff({ oldFile, newFile })
    : null
  return { preparedInput, treePayload, diffPayload }
}

// 客户端
function IDEPage({ preparedInput, treePayload, diffPayload }) {
  const { model } = useFileTree({ preparedInput, id: TREE_ID })
  return (
    <Layout>
      <FileTree model={model} preloadedData={treePayload} />
      <main>
        {diffPayload && <MultiFileDiff {...diffPayload} />}
      </main>
    </Layout>
  )
}
```

### 性能预算建议

| 资源 | 单页面预算 |
|---|---|
| Diff 数（视区内） | ≤ 5 同时高亮 |
| 文件树路径 | ≤ 50,000（更多需服务端分页） |
| Worker Count | CPU 核数 / 2，最少 2，最多 4 |
| Annotation 数 | ≤ 500（更多考虑虚拟化） |
