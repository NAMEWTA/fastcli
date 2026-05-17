# @pierre/trees — React API 完整参考

## 目录

- [核心 API 概览](#核心-api-概览)
- [useFileTree 选项详解](#usefiletree-选项详解)
- [FileTree 组件 props](#filetree-组件-props)
- [Hooks（读状态）](#hooks读状态)
- [model 命令式方法（写状态）](#model-命令式方法写状态)
- [搜索控制](#搜索控制)
- [拖拽与重命名](#拖拽与重命名)
- [自定义图标](#自定义图标)
- [行装饰（renderRowDecoration）](#行装饰renderrowdecoration)
- [大型树性能模式](#大型树性能模式)
- [SSR](#ssr)

## 核心 API 概览

```tsx
import {
  useFileTree,                    // 创建 model 的 hook
  FileTree,                       // 渲染组件
  useFileTreeSelection,           // 读取选中路径
  useFileTreeSearch,              // 读取搜索状态 + 操作
  useFileTreeSelector,            // 自定义派生选择器
} from '@pierre/trees/react'
```

设计哲学：**model 是唯一状态来源，hook 是非受控的（uncontrolled）**。给 `useFileTree` 传新的 `paths` / `gitStatus` 等不会触发更新，必须显式调用 `model.resetPaths` / `model.setGitStatus`。

## useFileTree 选项详解

```tsx
const { model } = useFileTree({
  // ============ 数据源（三选一）============
  paths: ['src/index.ts', 'src/utils.ts', 'package.json'],
  // 或 preparedInput（推荐 ≥500 路径）
  // preparedInput: prepareFileTreeInput(paths),

  // ============ ID（SSR 必需）============
  id: 'main-sidebar',                       // 服务端/客户端必须一致

  // ============ 初始展开状态 ============
  initialExpansion: 'all-expanded',         // 'all-expanded' | 'all-collapsed' | { depth: 2 }
  initialExpandedPaths: ['src', 'src/components'],
  initialSelectedPaths: ['src/index.ts'],

  // ============ 搜索 ============
  search: true,                             // 启用搜索框
  fileTreeSearchMode: 'hide-non-matches',   // 'hide-non-matches' | 'collapse-non-matches' | 'expand-matches'

  // ============ 外观 ============
  icons: 'standard',                        // 'minimal' | 'standard' | 'complete' | FileTreeIconConfig
  density: 'default',                       // 'compact' | 'default' | 'relaxed' | number（spacing factor）

  // ============ Git 状态 ============
  gitStatus: {
    'src/index.ts': 'modified',
    'src/new.ts':   'added',
    'src/old.ts':   'deleted',
    'rename.ts':    'renamed',
    'untrack.ts':   'untracked',
    'ignored.ts':   'ignored',
  },

  // ============ 交互 ============
  dragAndDrop: {
    canDrag: (paths) => !paths.includes('package.json'),
    canDrop: (event) => !event.targetPath.startsWith('dist/'),
    onDropComplete: (event) => saveMove(event.draggedPaths, event.targetPath),
    onDropError: (error, event) => showToast(error.message),
  },
  renaming: {
    canRename: (item) => !['package.json', '.gitignore'].includes(item.path),
    onRename: (event) => saveRename(event.sourcePath, event.destinationPath),
    onError: (error) => showToast(error.message),
  },

  // ============ 行为 ============
  flattenEmptyDirectories: true,            // 单子目录折叠（如 src/components/ 仅含 Button/）
  initialVisibleRowCount: 30,               // 首屏渲染行数提示
  overscan: 5,                              // 屏幕外预渲染额外行数

  // ============ 行装饰 ============
  renderRowDecoration: (item) => {
    if (item.path.endsWith('.test.ts')) {
      return '<span class="badge-test">T</span>'
    }
  },

  // ============ 回调 ============
  onSelectionChange: (paths) => setActiveFile(paths[0]),
  onSearchChange: (query) => analyticsTrack('tree_search', { query }),
})
```

### initialExpansion 取值

- `'all-expanded'`：所有目录展开
- `'all-collapsed'`：所有目录折叠
- `{ depth: number }`：展开到第 N 层（根为 0）

### fileTreeSearchMode 对比

| 模式 | 行为 | 适用 |
|---|---|---|
| `hide-non-matches` | 隐藏不匹配的节点（连同父目录） | 大型树聚焦匹配 |
| `collapse-non-matches` | 不匹配的目录折叠 | 保留树结构感 |
| `expand-matches` | 展开包含匹配的路径，不隐藏其他 | 小型树 |

## FileTree 组件 props

```tsx
<FileTree
  model={model}
  className="sidebar-tree"
  style={{ height: '100%', width: 280 }}
  tabIndex={0}                              // 容器可聚焦（键盘导航必需）

  // composition slot
  header={<div className="tree-header">Files</div>}
  footer={<div className="tree-footer">{count} files</div>}

  // 上下文菜单（右键 / 长按）
  renderContextMenu={(item, ctx) => (
    <ContextMenu
      item={item}
      onRename={() => model.startRenaming(item.path)}
      onDelete={() => deleteFile(item.path)}
    />
  )}

  // SSR 水合
  preloadedData={ssrPayload}
/>
```

**容器必须有显式高度**，虚拟化依赖 CSS 高度计算可见区域。常见模式：

```tsx
// 父容器使用 flex 撑开
<div style={{ display: 'flex', height: '100vh' }}>
  <FileTree model={model} style={{ height: '100%', width: 280, flexShrink: 0 }} />
  <main style={{ flex: 1 }}>...</main>
</div>
```

## Hooks（读状态）

### useFileTreeSelection

```tsx
import { useFileTreeSelection } from '@pierre/trees/react'

const selectedPaths: string[] = useFileTreeSelection(model)
const activePath = selectedPaths[0]
```

仅在选中路径变化时触发重渲染。

### useFileTreeSearch

```tsx
import { useFileTreeSearch } from '@pierre/trees/react'

const {
  isOpen,           // 搜索框是否可见
  value,            // 当前查询
  matchingPaths,    // 当前匹配的路径数组
  open,             // open(initialQuery?) 打开搜索框
  close,            // 关闭
  setValue,         // 编程式更新查询
} = useFileTreeSearch(model)
```

### useFileTreeSelector（自定义派生）

```tsx
import { useFileTreeSelector } from '@pierre/trees/react'

const focusedPath = useFileTreeSelector(model, state => state.focusedPath)
const expandedCount = useFileTreeSelector(model, state => state.expandedPaths.size)

// 派生 boolean，仅在结果变化时重渲染
const isFileSelected = useFileTreeSelector(
  model,
  state => state.selectedPaths.includes('src/index.ts')
)
```

`useFileTreeSelector` 内部使用浅比较，避免传入返回新对象的 selector。

## model 命令式方法（写状态）

直接调用 model 方法**不会**触发当前组件的 React 重渲染——它会改变内部状态，订阅 hook（`useFileTreeSelection` 等）的组件会按需更新。

```ts
// 焦点
model.focusPath('src/components/Button.tsx')

// 重命名（进入编辑态）
model.startRenaming('src/utils.ts')

// 整树替换（不要重建 model）
model.resetPaths(newPaths)

// 增量 Git 状态
model.setGitStatus({ 'src/index.ts': 'modified' })

// 批量变更
model.batch([
  { type: 'add',    path: 'src/new.ts' },
  { type: 'remove', path: 'src/old.ts' },
  { type: 'move',   fromPath: 'src/a.ts', toPath: 'src/b.ts' },
])

// 更新图标配置
model.setIcons('complete')
model.setIcons({ set: 'standard', byFileExtension: { tsx: { name: 'react-icon' } } })
```

### Item Handle

```ts
const item = model.getItem('src/components')

if (item) {
  item.select()
  item.focus()
  // 仅 directory 有展开方法
  if (item.kind === 'directory') {
    item.expand()
    item.collapse()
    item.toggle()
  }
}
```

## 搜索控制

### 显式打开/关闭搜索框

```ts
model.openSearch()                    // 打开空搜索框
model.openSearch('Button')            // 打开并预填查询
model.closeSearch()
```

### 编程式搜索（不显示 UI）

```ts
model.setSearch('Button')             // 搜索但不显示输入框
model.setSearch('')                   // 清除
```

### 匹配结果导航

```ts
model.focusNextSearchMatch()
model.focusPreviousSearchMatch()
```

### 全局快捷键集成

```tsx
import { useHotkeys } from '@mantine/hooks'  // 或任意 hotkey 库

useHotkeys([
  ['mod+P', () => model.openSearch()],
  ['Escape', () => useFileTreeSearch(model).close()],
])
```

## 拖拽与重命名

### 拖拽事件结构

```ts
interface DragDropEvent {
  draggedPaths: string[]              // 被拖动的路径（多选支持）
  targetPath: string                  // 落点目录路径
  position: 'before' | 'inside' | 'after'  // 落点相对位置
}

dragAndDrop: {
  canDrag: (paths: string[]) => boolean,
  canDrop: (event: DragDropEvent) => boolean,
  onDropComplete: (event: DragDropEvent) => void | Promise<void>,
  onDropError: (error: Error, event: DragDropEvent) => void,
}
```

### 异步拖拽（持久化失败回滚）

```tsx
dragAndDrop: {
  onDropComplete: async (event) => {
    const snapshot = currentPaths()
    try {
      await api.moveFile(event.draggedPaths, event.targetPath)
    } catch (e) {
      // 回滚：还原到拖拽前的快照
      model.resetPaths(snapshot)
      throw e   // 触发 onDropError
    }
  },
  onDropError: (error) => notifications.show({ color: 'red', message: error.message }),
}
```

### 重命名

```tsx
renaming: {
  canRename: (item) => !['package.json', '.gitignore', 'node_modules'].some(p => item.path.endsWith(p)),
  onRename: async (event) => {
    // event.sourcePath = 旧路径, event.destinationPath = 新路径
    await api.renameFile(event.sourcePath, event.destinationPath)
  },
  onError: (error) => notifications.show({ color: 'red', message: error.message }),
}

// 程序触发重命名
<button onClick={() => model.startRenaming(activePath)}>F2 重命名</button>
```

## 自定义图标

```ts
import type { FileTreeIconConfig } from '@pierre/trees'

const icons: FileTreeIconConfig = {
  set: 'standard',                          // 基础图标集
  colored: true,                            // 是否启用彩色

  // 可选：自定义 SVG sprite，需包含 <symbol id="..."> 定义
  spriteSheet: mySvgString,

  // 优先级：byFileName > byFileNameContains > byFileExtension > 默认
  byFileName: {
    'package.json': { name: 'npm-icon' },
    'Dockerfile':   { name: 'docker-icon' },
    'tsconfig.json': { name: 'ts-config-icon' },
  },

  byFileNameContains: {
    'dockerfile': { name: 'docker-icon' },
    '.eslintrc':  { name: 'eslint-icon' },
  },

  // 多段扩展名优先级高（spec.ts > ts）
  byFileExtension: {
    'ts':       { name: 'typescript-icon' },
    'tsx':      { name: 'react-icon' },
    'spec.ts':  { name: 'test-icon' },
    'test.tsx': { name: 'test-icon' },
    'md':       { name: 'markdown-icon' },
  },

  // 替换内置槽位
  remap: {
    'generic-file': { name: 'custom-file-icon' },
    'chevron':      { name: 'my-chevron', width: 12, height: 12, viewBox: '0 0 12 12' },
  },
}

const { model } = useFileTree({ paths, icons })
```

## 行装饰（renderRowDecoration）

在文件名右侧追加任意 HTML（不进入 React 树，**返回 HTML 字符串**或 HTMLElement）：

```tsx
const { model } = useFileTree({
  renderRowDecoration: (item) => {
    if (item.path.endsWith('.generated.ts')) {
      return '<span class="badge-gen" title="Auto-generated">gen</span>'
    }
    if (item.path.includes('deprecated')) {
      return '<span class="badge-dep" title="Deprecated">!</span>'
    }
    if (item.path.endsWith('.test.ts') || item.path.endsWith('.spec.ts')) {
      return '<span class="badge-test">T</span>'
    }
  },
})
```

⚠️ 返回字符串会用 `innerHTML` 设置，**必须自行转义动态内容**。

## 大型树性能模式

### 服务端预处理（推荐）

```tsx
// app/sidebar/page.tsx (Next.js Server Component)
import { prepareFileTreeInput } from '@pierre/trees'
import { ClientSidebar } from './client-sidebar'

export default async function Page() {
  const allPaths = await fetchAllPaths()                  // I/O 在服务端
  const preparedInput = prepareFileTreeInput(allPaths)    // CPU 在服务端
  return <ClientSidebar preparedInput={preparedInput} />
}
```

```tsx
// app/sidebar/client-sidebar.tsx
'use client'
import { useFileTree, FileTree } from '@pierre/trees/react'

export function ClientSidebar({ preparedInput }) {
  const { model } = useFileTree({
    preparedInput,
    density: 'compact',
    initialVisibleRowCount: 30,
    overscan: 5,
  })
  return <FileTree model={model} style={{ height: '100%' }} />
}
```

### 增量更新而非整树重建

```ts
// ❌ 慢：每次都重建全部数据
useFileTree({ paths: latestPaths })

// ✅ 快：只对变化的部分调用方法
useEffect(() => {
  model.batch(diff.changes.map(c => {
    if (c.kind === 'add')    return { type: 'add', path: c.path }
    if (c.kind === 'remove') return { type: 'remove', path: c.path }
    if (c.kind === 'move')   return { type: 'move', fromPath: c.from, toPath: c.to }
  }))
}, [diff])
```

### Density 自定义

```ts
density: 'compact'    // ≈ 22px 行高
density: 'default'    // ≈ 28px 行高
density: 'relaxed'    // ≈ 32px 行高
density: 0.85         // 自定义 spacing 倍数（相对默认）
```

## SSR

服务端：

```ts
import { preloadFileTree, serializeFileTreeSsrPayload } from '@pierre/trees/ssr'

const TREE_ID = 'main-file-tree'   // 客户端必须使用相同常量

const payload = await preloadFileTree({
  paths: allPaths,
  id: TREE_ID,
  icons: 'standard',
  density: 'default',
  initialExpansion: 'all-expanded',
  gitStatus,
})

// RSC：直接传 payload prop
// 非 RSC：序列化为字符串嵌入 HTML
const serialized = serializeFileTreeSsrPayload(payload)
```

客户端：

```tsx
'use client'
import { useFileTree, FileTree } from '@pierre/trees/react'

export function ClientTree({ paths, gitStatus, payload }) {
  const { model } = useFileTree({
    paths,
    id: 'main-file-tree',          // ⚠️ 必须与服务端完全一致
    icons: 'standard',
    density: 'default',
    initialExpansion: 'all-expanded',
    gitStatus,
  })

  return <FileTree model={model} preloadedData={payload} style={{ height: '100%' }} />
}
```

⚠️ **任何 tree-defining 选项不一致都会导致 hydration mismatch**。把这些选项抽到共享常量文件：

```ts
// lib/tree-config.ts（服务端和客户端共享）
export const TREE_ID = 'main-file-tree'
export const TREE_DEFAULTS = {
  icons: 'standard' as const,
  density: 'default' as const,
  initialExpansion: 'all-expanded' as const,
}
```

详见 [advanced-rendering.md](./advanced-rendering.md) 的 SSR 章节。
