---
name: pierre-diffs-trees
type: ui-ux-rule
description: >-
  使用 @pierre/diffs 与 @pierre/trees 构建代码审查、PR 视图、IDE 文件树、Merge Conflict 解决器。
  覆盖 React/Vanilla API、虚拟化、Worker Pool、SSR、Shadow DOM 主题、CodeMirror 集成。
  触发词：pierre、diff 渲染、文件树、PR 视图、merge conflict。
version: "1.0.0"
author: "wta"
---

# Pierre Diffs & Trees 开发规范

为 AI 代理提供使用 `@pierre/diffs`（高性能代码差异渲染）和 `@pierre/trees`（路径优先文件树）构建 IDE 风格界面的程序性知识。两个包共享同一套设计语言（Shiki 主题、Shadow DOM 隔离、纯 HTML 输出），常作为代码审查、PR 视图、文件浏览器的组合使用。

> **官方文档**
> - Diffs: https://diffs.com/docs · Playground: https://diffs.com/playground
> - Trees: https://trees.software/docs
> - GitHub: https://github.com/pierrecomputer/pierre

## 1. 何时使用本技能

触发以下任一场景立即应用本技能：

- 渲染 Git diff、PR 改动、AI 代码改动建议（accept/reject）
- 构建 IDE 风格的左侧文件树 + 右侧编辑器/diff 双栏
- 处理 unified diff / patch 字符串可视化
- 实现 Merge Conflict 解决 UI
- 文件树需要 Git 状态着色、自定义图标、拖拽、重命名、搜索
- 大文件（万行以上）或大量文件（数百个）的高性能 diff 渲染
- 与 CodeMirror 6 共存的代码工作台

## 2. 包结构与入口点

### 2.1 安装

```bash
# 推荐 bun（官方工具链）；npm/pnpm/yarn 同样可用
bun add @pierre/diffs @pierre/trees
```

要求 React 18+（如使用 React 入口）。Worker Pool 模式需打包工具支持 `new Worker(new URL(...), { type: 'module' })`（Vite/webpack 5/Next.js 都已支持）。

### 2.2 子路径入口

| 包 | 入口 | 用途 |
|---|---|---|
| `@pierre/diffs` | `@pierre/diffs` | Vanilla 组件 + 工具函数 |
| `@pierre/diffs` | `@pierre/diffs/react` | React 组件（推荐） |
| `@pierre/diffs` | `@pierre/diffs/ssr` | 服务端预渲染（Next.js / Remix） |
| `@pierre/diffs` | `@pierre/diffs/worker` | Worker Pool（高亮移出主线程） |
| `@pierre/trees` | `@pierre/trees` | Vanilla 核心 + 准备函数 |
| `@pierre/trees` | `@pierre/trees/react` | React hook + 组件 |
| `@pierre/trees` | `@pierre/trees/ssr` | 服务端预渲染 |

## 3. 核心心智模型（必读）

### 3.1 Diffs：HTML-first + Shadow DOM

底层 API 输出**纯 HTML 字符串**，高阶组件渲染进 **Shadow DOM + CSS Grid**。带来两个后果：

- **优点**：浏览器解析路径最短，性能可观；Shadow DOM 防止外部样式污染
- **代价**：外部 CSS **不会**自动穿透到 Diff 内部，自定义样式必须走 `style` prop（CSS 变量）或 `options.unsafeCSS`，详见 [theming-and-shadow-dom.md](references/theming-and-shadow-dom.md)

### 3.2 Diffs：两个核心数据结构

```ts
// 单个文件
interface FileContents {
  filename: string     // 用于语言检测和 header 显示
  contents: string     // 完整文本
  cacheKey?: string    // 可选，启用 Worker Pool 渲染缓存
}

// 文件差异（不要手构造，使用工具函数生成）
import { parseDiffFromFile, parsePatchFiles } from '@pierre/diffs'

const diff = parseDiffFromFile(oldFile, newFile)        // 从两个版本生成
const diffs = parsePatchFiles(unifiedDiffString)        // 解析 patch 字符串（支持多文件）
```

### 3.3 Trees：路径优先（path-first）

每个节点的唯一标识符是**完整规范路径字符串**（如 `src/components/Button.tsx`）。所有操作（select / focus / search / rename / drop）都以路径作参数。**model 是唯一状态来源，DOM 只是渲染结果，hook 是非受控的**——传给 `useFileTree` 的选项变化不会自动同步树，必须通过 `model.resetPaths()` / `model.setGitStatus()` 等显式调用。

### 3.4 Trees：三种输入格式

| 格式 | 适用场景 | 性能 |
|---|---|---|
| `paths: string[]` | < 500 路径、Demo、测试 | 低（客户端实时整理） |
| `prepareFileTreeInput(paths)` | 生产/中大型树（≥ 500） | 高（预先整理） |
| `preparePresortedFileTreeInput(sortedPaths)` | 服务端已知排序顺序 | 最高 |

大型树**必须**在服务端或 loader 里调用 prepare 函数，把客户端的初始化时间拉到接近 0。

## 4. 组件选型决策表

### 4.1 @pierre/diffs

| 输入 | React | Vanilla JS |
|---|---|---|
| 两份文件版本（最常见） | `<MultiFileDiff oldFile newFile>` | `new FileDiff({ oldFile, newFile })` |
| 已解析的 `FileDiffMetadata` | `<FileDiff fileDiff>` | `new FileDiff({ fileDiff })` |
| Patch / unified diff 字符串 | `<PatchDiff patch>` | `parsePatchFiles` 后用 `new FileDiff` |
| 单文件查看（无 diff） | `<File file>` | `new File({ file })` |
| 含 `<<<<<<<` 冲突标记 | `<UnresolvedFile file>` | `new UnresolvedFile({ file })` |
| 大文件 / 数百文件批量 | `<Virtualizer>` + `<VirtualizedFileDiff>` | `new Virtualizer` + `new VirtualizedFileDiff` |

### 4.2 @pierre/trees

| 场景 | 框架 | 用法 |
|---|---|---|
| React 应用文件树 | React | `useFileTree({ paths }) → <FileTree model>` |
| Vue/Svelte/Angular | Vanilla | `new FileTree({ paths }) → tree.render({ ... })` |
| 万级路径 | 任意 | 服务端 `prepareFileTreeInput` → 客户端 `preparedInput` |
| 已 SSR | 任意 | `preloadFileTree` → `tree.hydrate` / `<FileTree preloadedData>` |

## 5. Diffs 快速开始（React）

最常见的两文件 diff：

```tsx
import { MultiFileDiff } from '@pierre/diffs/react'

<MultiFileDiff
  oldFile={{ filename: 'src/app.ts', contents: oldCode }}
  newFile={{ filename: 'src/app.ts', contents: newCode }}
  options={{
    theme: 'pierre-dark',         // Shiki 主题，默认 'pierre-dark'
    layout: 'split',              // 'split'（左右）| 'stacked'（上下统一视图）
    lineDiffType: 'word',         // 'word' | 'char' | 'none'（内联粒度）
    changeStyle: 'bars',          // 'bars' | 'classic' | 'none'
    showLineNumbers: true,
    wrapLines: false,
    collapsed: false,
    hunkSeparators: 'line-info',  // 'line-info' | 'line-info-basic' | 'metadata' | 'simple'
  }}
/>
```

PR 风格批量 diff（解析 patch）：

```tsx
import { PatchDiff, parsePatchFiles } from '@pierre/diffs'

<PatchDiff patch={unifiedDiff} options={{ theme: 'pierre-dark', layout: 'split' }} />
```

完整 props（header 自定义、annotations、token hooks）见 [diffs-react-api.md](references/diffs-react-api.md)。Vanilla 用法见 [diffs-vanilla-api.md](references/diffs-vanilla-api.md)。

## 6. Diffs 关键能力速览

### 6.1 Annotations（行内组件）

```tsx
<MultiFileDiff
  oldFile={...} newFile={...}
  annotations={[
    { line: 23, side: 'right', render: () => <CommentBubble /> },
    { line: 5,  side: 'left',  render: () => <span>📌</span> },
  ]}
/>
```

`side` 仅在 `layout: 'split'` 下有效（左旧右新）；`stacked` 模式下忽略。

### 6.2 Accept / Reject Hunks（AI 代码建议核心）

```ts
import { diffAcceptRejectHunk } from '@pierre/diffs'

const next = diffAcceptRejectHunk(diff, hunkIndex, 'accept')   // 接受
const next = diffAcceptRejectHunk(diff, hunkIndex, 'reject')   // 拒绝
const next = diffAcceptRejectHunk(diff, hunkIndex, 'both')     // 保留两者
const next = diffAcceptRejectHunk(diff, hunkIndex, { type: 'accept', changeIndex: 0 })
```

完整交互模板（含 annotation 渲染按钮）见 [accept-reject-and-conflicts.md](references/accept-reject-and-conflicts.md)。

### 6.3 Merge Conflict 解决

`<UnresolvedFile>` 是 **uncontrolled** 组件，需用 `key` 强制重置：

```tsx
<UnresolvedFile key={resetKey} file={{ filename, contents: conflictedCode }} />
```

编程式调用 `resolveMergeConflict(file, choices)` 获取已解决的字符串，详见 [accept-reject-and-conflicts.md](references/accept-reject-and-conflicts.md)。

### 6.4 语言覆盖

文件名无扩展名（如 `Dockerfile`）或扩展名误导时：

```ts
import { setLanguageOverride } from '@pierre/diffs'

const file = setLanguageOverride({ filename: 'Dockerfile', contents }, 'dockerfile')
```

### 6.5 提前预加载高亮（消除首次延迟）

```ts
import { preloadHighlighter } from '@pierre/diffs'

await preloadHighlighter({
  themes: ['pierre-dark'],
  langs: ['typescript', 'tsx', 'css', 'json'],
})
```

## 7. Trees 快速开始（React）

```tsx
import { useFileTree, FileTree, useFileTreeSelection } from '@pierre/trees/react'

function Sidebar({ paths, gitStatus }) {
  const { model } = useFileTree({
    paths,
    icons: 'standard',                     // 'minimal' | 'standard' | 'complete'
    density: 'default',                    // 'compact' | 'default' | 'relaxed' | number
    initialExpansion: 'all-expanded',      // 'all-expanded' | 'all-collapsed' | { depth: number }
    gitStatus,                             // { 'src/index.ts': 'modified', ... }
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    flattenEmptyDirectories: true,
    onSelectionChange: (paths) => setActiveFile(paths[0]),
    dragAndDrop: {
      canDrag: (paths) => !paths.includes('package.json'),
      onDropComplete: (e) => saveMove(e.draggedPaths, e.targetPath),
    },
    renaming: {
      canRename: (item) => !['package.json', '.gitignore'].includes(item.path),
      onRename: (e) => saveRename(e.sourcePath, e.destinationPath),
    },
  })

  return (
    <FileTree
      model={model}
      style={{ height: '100%', width: 280 }}
      header={<div>Files</div>}
    />
  )
}
```

完整 React API（hooks、composition、命令式方法）见 [trees-react-api.md](references/trees-react-api.md)。Vanilla 用法见 [trees-vanilla-api.md](references/trees-vanilla-api.md)。

## 8. Trees 关键能力速览

### 8.1 读取状态（React）

```tsx
import { useFileTreeSelection, useFileTreeSearch, useFileTreeSelector } from '@pierre/trees/react'

const selectedPaths = useFileTreeSelection(model)
const { isOpen, value, matchingPaths, open, close } = useFileTreeSearch(model)
const focusedPath = useFileTreeSelector(model, s => s.focusedPath)  // 自定义派生
```

### 8.2 写入状态（命令式，不会触发 React 重渲染）

```ts
model.focusPath('src/index.ts')
model.startRenaming('src/utils.ts')
model.openSearch('Button')
model.resetPaths(newPaths)                           // 整树替换
model.setGitStatus({ 'src/a.ts': 'modified' })       // 增量 Git 状态
model.batch([                                        // 批量变更
  { type: 'add',    path: 'src/new.ts' },
  { type: 'remove', path: 'src/old.ts' },
  { type: 'move',   fromPath: 'src/a.ts', toPath: 'src/b.ts' },
])

const item = model.getItem('src/components')         // item handle
if (item?.kind === 'directory') item.expand()
```

### 8.3 自定义图标 / 行装饰

```tsx
const { model } = useFileTree({
  icons: {
    set: 'standard',
    spriteSheet: mySvgSprite,                        // 自定义 <symbol> 集
    byFileName: { 'package.json': { name: 'npm-icon' } },
    byFileExtension: { 'tsx': { name: 'react-icon' }, 'spec.ts': { name: 'test-icon' } },
  },
  renderRowDecoration: (item) => {
    if (item.path.endsWith('.generated.ts')) return '<span class="badge-gen">gen</span>'
  },
})
```

详见 [trees-react-api.md](references/trees-react-api.md) 中的图标章节。

## 9. 主题与 Shadow DOM（高频陷阱）

**Diffs 的 Shadow DOM 不让外部 CSS 穿透**。要定制必须用以下三种方式之一：

```tsx
// 1. style prop：CSS 变量与字体直接穿透
<MultiFileDiff style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', lineHeight: '20px' }} />

// 2. 内置主题 + 自定义主题注册
import { registerCustomTheme } from '@pierre/diffs'
registerCustomTheme(myShikiThemeJson)

// 3. unsafeCSS：注入任意 CSS 到 Shadow DOM（慎用，仅用 data-* 属性选择器）
<MultiFileDiff options={{ unsafeCSS: `[data-diffs-line][data-type="add"] { background: rgba(0,200,0,0.1); }` }} />
```

**Trees 在 Light DOM**，CSS 变量直接覆盖即可。完整变量表与 `themeToTreeStyles()` 工具见 [theming-and-shadow-dom.md](references/theming-and-shadow-dom.md)。

## 10. 性能优化路径

按数据规模选择：

| 规模 | 推荐组合 |
|---|---|
| 单文件 < 500 行 | 默认 React 组件即可 |
| 单文件数千行 / 同页 < 20 文件 | 默认 + `preloadHighlighter` 预热 |
| 数十~数百文件 | `<Virtualizer>` + `<VirtualizedFileDiff>` |
| 大文件（万行+）+ 多文件 | 虚拟化 + Worker Pool（必备） |
| 万级文件树 | 服务端 `prepareFileTreeInput` |

虚拟化与 Worker Pool 完整 API、`cacheKey` 用法见 [advanced-rendering.md](references/advanced-rendering.md)。

> ⚠️ Worker Pool 激活时，`theme` / `lineDiffType` / `useTokenTransformer` 由 Pool 统一控制，组件级别传入会被忽略。

## 11. SSR 概览

服务端预渲染减少首屏 LCP，特别适合 PR 详情页和文件浏览页：

```ts
// 服务端
import { preloadMultiFileDiff } from '@pierre/diffs/ssr'
import { preloadFileTree } from '@pierre/trees/ssr'

const diffPayload = await preloadMultiFileDiff({ oldFile, newFile, options: { theme: 'pierre-dark' } })
const treePayload = await preloadFileTree({ paths, id: 'main-tree', icons: 'standard' })
```

```tsx
// 客户端（'use client' / Remix loader 等）
<MultiFileDiff {...diffPayload} />
<FileTree model={model} preloadedData={treePayload} />
```

⚠️ Trees SSR 水合的客户端必须使用与服务端**完全相同**的 tree-defining 选项（`id`、`paths`、`initialExpansion`、`icons` 等），不一致会导致 hydration mismatch。完整工作流见 [advanced-rendering.md](references/advanced-rendering.md)。

## 12. 与 CodeMirror 6 集成

Diffs（Shadow DOM）和 CM6（Light DOM）共存时的关键约束：

1. **字体对齐**：CM6 与 Diff 的 `fontFamily` / `fontSize` / `lineHeight` 必须一致，否则切换视图时会跳动
2. **主题同步**：从 CM6 提取计算样式生成 Diffs `style` 与 Trees CSS 变量
3. **焦点管理**：Trees 容器加 `tabIndex={0}`；切换到 CM6 用 `setTimeout` 延迟聚焦避免事件冲突
4. **生命周期**：切换文件时销毁旧 `EditorView` 再创建新实例（不要 `setState(doc)`）

完整 IDE 三栏布局示例（FileTree + CM6 + MultiFileDiff 切换）见 [codemirror-integration.md](references/codemirror-integration.md)。

## 13. 常见陷阱速查

| 现象 | 原因 | 修复 |
|---|---|---|
| 高亮显示纯文本 | Shiki 异步加载 / 语言未识别 | `preloadHighlighter` 或 `setLanguageOverride` |
| 快速挂载/卸载后高亮停摆 | 已知 Bug #337 | 启用 Worker Pool（独立生命周期） |
| 自定义 CSS 不生效 | Shadow DOM 隔离 | 用 `style` prop（变量）或 `options.unsafeCSS` |
| Trees 选项更新但树没变 | hook 是非受控的 | 调用 `model.resetPaths` / `model.setGitStatus` |
| SSR hydration mismatch | 服务端/客户端 `id` 或 paths 不同 | 全局共享 `TREE_ID` 常量 |
| 大型树初始化卡顿 | 客户端实时整理 | 服务端 `prepareFileTreeInput` |
| 触摸设备拖拽不工作 | 当前基于 HTML5 DnD | 已知限制，等官方更新 |
| Worker Pool 下主题不生效 | 主题由 Pool 统一控制 | 在 `WorkerPoolContextProvider` / `pool.setRenderOptions` 设置 |

更多调试场景与代码示例见 [troubleshooting.md](references/troubleshooting.md)。

## 14. References 导航

按需加载下面的参考文档，**不要**预先全部读入上下文：

| 文档 | 何时阅读 |
|---|---|
| [diffs-react-api.md](references/diffs-react-api.md) | 实现 Diffs 的 React UI 时（完整 props、annotations、token hooks） |
| [diffs-vanilla-api.md](references/diffs-vanilla-api.md) | 在 Vue/Svelte/原生 JS 中接入 Diffs |
| [trees-react-api.md](references/trees-react-api.md) | 实现 Trees 的 React UI 时（hooks、命令式方法、图标） |
| [trees-vanilla-api.md](references/trees-vanilla-api.md) | 在 Vue/Svelte/原生 JS 中接入 Trees |
| [advanced-rendering.md](references/advanced-rendering.md) | 性能调优（虚拟化、Worker Pool、缓存、SSR） |
| [theming-and-shadow-dom.md](references/theming-and-shadow-dom.md) | 自定义主题、CSS 变量、Shadow DOM 注入 |
| [codemirror-integration.md](references/codemirror-integration.md) | 与 CodeMirror 6 协同工作的 IDE 布局 |
| [accept-reject-and-conflicts.md](references/accept-reject-and-conflicts.md) | 实现 AI 代码改动接受/拒绝、Merge Conflict 解决 |
| [troubleshooting.md](references/troubleshooting.md) | 排错与调试（高亮失效、hydration、性能问题） |

## 15. 快速参考速查表

### 15.1 Diffs Layout / 样式选项

| 选项 | 取值 | 效果 |
|---|---|---|
| `layout` | `split` / `stacked` | 左右对比 / 统一视图 |
| `changeStyle` | `bars` / `classic` / `none` | 竖条 / +/- 符号 / 仅背景 |
| `lineDiffType` | `word` / `char` / `none` | 内联高亮粒度 |
| `hunkSeparators` | `line-info` / `line-info-basic` / `metadata` / `simple` | hunk 间分隔风格 |
| `theme` | `pierre-light` / `pierre-dark` / 任意 Shiki 主题 | 配色方案 |

### 15.2 Trees 状态操作（React vs Vanilla）

| 操作 | React | Vanilla |
|---|---|---|
| 选中路径 | `useFileTreeSelection(model)` | `model.getSelectedPaths()` |
| 焦点路径 | `useFileTreeSelector(m, s => s.focusedPath)` | `model.getFocusedPath()` |
| 聚焦 | `model.focusPath(path)` | `model.focusPath(path)` |
| 展开目录 | `model.getItem(path)?.expand()` | 同左 |
| 整树替换 | `model.resetPaths(newPaths)` | 同左 |
| Git 状态 | `model.setGitStatus(map)` | 同左 |
| 打开搜索 | `model.openSearch()` | 同左 |
| 订阅变化 | hook 自动 | `model.subscribe(listener)` |

### 15.3 LLM 文档 URL（按需查阅最新 API）

- Diffs 文档：https://diffs.com/docs
- Trees 文档：https://trees.software/docs
- 在线调试：https://diffs.com/playground

需要某个具体 prop 或边界场景时，先查上述官方文档；本 SKILL 与 references 覆盖的是工程化集成路径。
