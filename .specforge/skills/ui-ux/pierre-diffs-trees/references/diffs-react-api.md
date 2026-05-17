# @pierre/diffs — React API 完整参考

## 目录

- [组件清单](#组件清单)
- [MultiFileDiff](#multifilediff)
- [PatchDiff](#patchdiff)
- [FileDiff](#filediff)
- [File](#file)
- [UnresolvedFile](#unresolvedfile)
- [Annotations 模式](#annotations-模式)
- [Header 自定义](#header-自定义)
- [Token Hooks（实验性）](#token-hooks实验性)
- [工具函数](#工具函数)

## 组件清单

```ts
import {
  MultiFileDiff,        // 传两份 FileContents，内部自动 diff
  PatchDiff,            // 传 unified diff / patch 字符串
  FileDiff,             // 传已解析的 FileDiffMetadata
  File,                 // 单文件渲染（无 diff）
  UnresolvedFile,       // 含 <<<<<<< 冲突标记的文件解决 UI
  Virtualizer,          // 虚拟化滚动容器
  VirtualizedFileDiff,
  VirtualizedFile,
  WorkerPoolContextProvider,  // Worker Pool React Context
} from '@pierre/diffs/react'
```

## MultiFileDiff

最常用入口，自动从两份文件版本计算 diff。

```tsx
<MultiFileDiff
  oldFile={{ filename: 'src/app.ts', contents: oldCode, cacheKey: 'v1' }}
  newFile={{ filename: 'src/app.ts', contents: newCode, cacheKey: 'v2' }}
  options={{
    // ---- 显示选项 ----
    theme: 'pierre-dark',         // Shiki 主题；'pierre-light' / 'pierre-dark' / 任意 Shiki 主题名
    layout: 'split',              // 'split'（左右对比）| 'stacked'（统一视图）
    lineDiffType: 'word',         // 'word' | 'char' | 'none'（内联变更高亮粒度）
    changeStyle: 'bars',          // 'bars' | 'classic' | 'none'
    wrapLines: false,             // 自动换行
    showLineNumbers: true,
    collapsed: false,             // 折叠文件体（仅显示 header）
    hunkSeparators: 'line-info',  // 'line-info' | 'line-info-basic' | 'metadata' | 'simple'
    useTokenTransformer: false,   // 启用 token 元数据（开启后 DOM 增大）
    unsafeCSS: '',                // 注入自定义 CSS 到 Shadow DOM
  }}

  // ---- 字体（通过 style 直接穿透到 Shadow DOM）----
  style={{
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '13px',
    lineHeight: '20px',
  }}

  // ---- Header 自定义（三选一）----
  renderHeaderPrefix={(fileDiff) => <span>📁</span>}
  renderHeaderMetadata={(fileDiff) => <span>+{fileDiff.additions} -{fileDiff.deletions}</span>}
  renderCustomHeader={(fileDiff) => <CustomHeader fileDiff={fileDiff} />}

  // ---- Annotations ----
  annotations={[
    { line: 23, side: 'right', render: () => <CommentBubble /> },
  ]}

  // ---- Token Hooks（实验性）----
  onTokenEnter={({ tokenText, lineNumber, tokenElement }) => showTooltip(tokenElement, tokenText)}
  onTokenLeave={() => hideTooltip()}
  onTokenClick={({ tokenText, lineNumber }) => navigateToSymbol(tokenText)}
/>
```

### Layout 选择决策

- `split`：左旧右新，适合大屏审查、变更对比明显
- `stacked`：统一视图（删除在上、新增在下），类似 GitHub 默认风格，节省横向空间

### changeStyle 与 lineDiffType 的组合

| 场景 | 推荐 |
|---|---|
| 代码审查（默认） | `changeStyle: 'bars'` + `lineDiffType: 'word'` |
| 终端风格 | `changeStyle: 'classic'` + `lineDiffType: 'none'` |
| 文档/文本对比（细粒度） | `changeStyle: 'bars'` + `lineDiffType: 'char'` |

## PatchDiff

直接传 unified diff / patch 字符串，常用于 GitHub PR `.patch` URL：

```tsx
import { PatchDiff } from '@pierre/diffs/react'

const patch = await fetch(`https://github.com/owner/repo/pull/123.patch`).then(r => r.text())

<PatchDiff
  patch={patch}                              // 支持多文件 patch
  options={{ theme: 'pierre-dark', layout: 'stacked' }}
  renderHeaderPrefix={(fd) => <Badge>{fd.filename.split('.').pop()}</Badge>}
  annotations={[]}
/>
```

`PatchDiff` 内部会调用 `parsePatchFiles` 拆分多文件，依次渲染。

## FileDiff

传入预先解析或编辑过的 `FileDiffMetadata`，常用于 Accept/Reject 流程：

```tsx
import { FileDiff } from '@pierre/diffs/react'
import { parseDiffFromFile, diffAcceptRejectHunk } from '@pierre/diffs'

function ReviewableDiff({ oldFile, newFile }) {
  const [diff, setDiff] = useState(() => parseDiffFromFile(oldFile, newFile))

  return (
    <FileDiff
      fileDiff={diff}
      options={{ theme: 'pierre-dark', layout: 'split' }}
      annotations={diff.hunks.map((hunk, i) => ({
        line: hunk.newStart,
        side: 'right',
        render: () => (
          <Group gap={4}>
            <Button onClick={() => setDiff(diffAcceptRejectHunk(diff, i, 'accept'))}>✓</Button>
            <Button onClick={() => setDiff(diffAcceptRejectHunk(diff, i, 'reject'))}>✗</Button>
          </Group>
        ),
      }))}
    />
  )
}
```

## File

无 diff 的单文件查看，类似 GitHub 文件预览：

```tsx
import { File } from '@pierre/diffs/react'

<File
  file={{ filename: 'README.md', contents: markdownText }}
  options={{ theme: 'pierre-dark', wrapLines: true, showLineNumbers: true }}
  annotations={[
    { line: 10, side: 'right', render: () => <NoteIcon /> },
  ]}
/>
```

`File` 不接受 `layout` / `lineDiffType` / `changeStyle`（这些只对 diff 有意义）。

## UnresolvedFile

渲染含 `<<<<<<<` / `=======` / `>>>>>>>` 标记的合并冲突文件，自带 Accept Current/Incoming 按钮 UI。**该组件是 uncontrolled**，需要用 `key` 强制重置：

```tsx
import { UnresolvedFile } from '@pierre/diffs/react'

function ConflictResolver({ filename, conflictedCode }) {
  const [resetKey, setResetKey] = useState(0)

  return (
    <>
      <Button onClick={() => setResetKey(k => k + 1)}>重新开始</Button>
      <UnresolvedFile
        key={resetKey}
        file={{ filename, contents: conflictedCode }}
        options={{ theme: 'pierre-dark' }}
        onResolve={(resolvedContents) => save(filename, resolvedContents)}
      />
    </>
  )
}
```

编程式解决冲突参见 [accept-reject-and-conflicts.md](./accept-reject-and-conflicts.md)。

## Annotations 模式

Annotations 在指定行号位置注入任意 React 节点，常用于 PR 评论、AI 建议、行内警告。

```ts
interface Annotation {
  line: number                   // 1-based 行号
  side: 'left' | 'right'         // split 模式：left=旧版，right=新版；stacked 模式忽略
  render: () => React.ReactNode  // 渲染函数（每次状态变化重调用）
}
```

### 多行评论范围

```tsx
annotations={comments.map(c => ({
  line: c.line,
  side: c.side,
  render: () => (
    <Stack gap="xs" p="xs" style={{ background: 'var(--color-canvas-subtle)' }}>
      {c.replies.map(r => <CommentItem key={r.id} reply={r} />)}
      <ReplyForm threadId={c.threadId} />
    </Stack>
  ),
}))}
```

### 仅在 hunk 起始行显示按钮

```tsx
const annotations = useMemo(() => diff.hunks.map((hunk, i) => ({
  line: hunk.newStart,
  side: 'right' as const,
  render: () => <HunkActions diff={diff} index={i} onChange={setDiff} />,
})), [diff])
```

### 注意

- `render` 应返回稳定的组件以减少重渲染
- 同一行同一 side 多个 annotation 会**叠加**渲染
- annotation 的高度会自动撑开行高，不需要手动设置

## Header 自定义

三种粒度，按需选择：

```tsx
// 1. renderHeaderPrefix —— 在文件名左侧加图标/徽章
<MultiFileDiff renderHeaderPrefix={(fd) => <FileIcon filename={fd.filename} />} />

// 2. renderHeaderMetadata —— 在文件名右侧加统计/状态
<MultiFileDiff renderHeaderMetadata={(fd) => (
  <Group gap="xs">
    <Text c="green" size="xs">+{fd.additions}</Text>
    <Text c="red" size="xs">-{fd.deletions}</Text>
  </Group>
)} />

// 3. renderCustomHeader —— 完全替换 header
<MultiFileDiff renderCustomHeader={(fd) => (
  <Group justify="space-between" p="xs">
    <Text fw={500}>{fd.filename}</Text>
    <Group gap="xs">
      <Button size="xs">View Source</Button>
      <Button size="xs" variant="subtle">Collapse</Button>
    </Group>
  </Group>
)} />
```

`renderCustomHeader` 优先级最高，提供后会覆盖 prefix/metadata。

## Token Hooks（实验性）

启用 `useTokenTransformer: true` 后，每个语法 token 会获得元数据，可挂载交互（hover tooltip、跳转定义、LSP 联动）。

```tsx
<MultiFileDiff
  oldFile={oldFile}
  newFile={newFile}
  options={{ useTokenTransformer: true }}
  onTokenEnter={({ tokenText, lineNumber, lineCharStart, lineCharEnd, side, tokenElement }) => {
    if (isIdentifier(tokenText)) {
      showTooltip(tokenElement, lookupSymbol(tokenText, side, lineNumber))
    }
  }}
  onTokenLeave={() => hideTooltip()}
  onTokenClick={({ tokenText, lineNumber, side }) => {
    if (isIdentifier(tokenText)) navigateToDefinition(tokenText)
  }}
/>
```

⚠️ 启用后 DOM 节点数显著增加，万行级文件请同时启用虚拟化与 Worker Pool。

## 工具函数

```ts
import {
  parseDiffFromFile,        // 从两个 FileContents 生成 FileDiffMetadata
  parsePatchFiles,          // 解析 patch 字符串为 FileDiffMetadata[]
  trimPatchContext,         // 裁剪 patch 上下文行数（缩短长 hunk）
  preloadHighlighter,       // 预加载 Shiki 主题与语言
  registerCustomTheme,      // 注册自定义 Shiki 主题
  registerCustomLanguage,   // 注册自定义语言高亮
  setLanguageOverride,      // 强制 FileContents 的高亮语言
  diffAcceptRejectHunk,     // 编程式 Accept/Reject 单 hunk
  resolveMergeConflict,     // 解决 merge conflict，返回新文件字符串
  disposeHighlighter,       // 释放 Shiki 实例（SPA 路由切换时清理）
  getSharedHighlighter,     // 获取共享 Shiki 实例（高级用法）
} from '@pierre/diffs'
```

### preloadHighlighter

在路由切换前调用，避免首个 diff 渲染卡顿：

```ts
// 在 layout / loader 中
await preloadHighlighter({
  themes: ['pierre-dark', 'pierre-light'],
  langs: ['typescript', 'tsx', 'javascript', 'jsx', 'css', 'json', 'markdown', 'python'],
})
```

### trimPatchContext

PR 上下文行过多时裁剪：

```ts
const trimmed = trimPatchContext(patchString, 3)   // 仅保留每个 hunk 上下 3 行
```

### registerCustomTheme

```ts
import { registerCustomTheme } from '@pierre/diffs'
import myTheme from './my-theme.json'   // VS Code / Shiki 格式

registerCustomTheme(myTheme)
// 之后通过 myTheme.name 引用
<MultiFileDiff options={{ theme: myTheme.name }} />
```

更多主题细节见 [theming-and-shadow-dom.md](./theming-and-shadow-dom.md)。
