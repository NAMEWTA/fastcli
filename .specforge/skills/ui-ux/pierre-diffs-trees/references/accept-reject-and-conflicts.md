# Accept/Reject Hunks 与 Merge Conflict 解决

本文档覆盖两类核心交互：

- **Accept/Reject Hunks**：典型 AI 代码改动审查场景（接受/拒绝 AI 提出的某段修改）
- **Merge Conflict 解决**：处理 Git 合并冲突标记（`<<<<<<< HEAD ... =======  ... >>>>>>> branch`）

## 目录

- [Accept/Reject Hunks](#acceptreject-hunks)
- [完整 React Reviewer 模式](#完整-react-reviewer-模式)
- [全部接受 / 全部拒绝](#全部接受--全部拒绝)
- [子变更（changeIndex）粒度操作](#子变更changeindex粒度操作)
- [Merge Conflict 解决](#merge-conflict-解决)
- [UnresolvedFile 组件](#unresolvedfile-组件)
- [resolveMergeConflict 编程式 API](#resolvemergeconflict-编程式-api)
- [自定义解决 UI](#自定义解决-ui)
- [典型场景](#典型场景)

## Accept/Reject Hunks

`diffAcceptRejectHunk` 接收当前 `FileDiffMetadata`、目标 hunk 索引、以及决策类型，返回**新的** metadata。原始数据不可变。

```ts
import { diffAcceptRejectHunk } from '@pierre/diffs'

const next = diffAcceptRejectHunk(diff, hunkIndex, 'accept')   // 接受整个 hunk
const next = diffAcceptRejectHunk(diff, hunkIndex, 'reject')   // 拒绝整个 hunk
const next = diffAcceptRejectHunk(diff, hunkIndex, 'both')     // 同时保留两侧

// 子变更粒度（一个 hunk 内可能含多个非连续变更块）
const next = diffAcceptRejectHunk(diff, hunkIndex, { type: 'accept', changeIndex: 0 })
const next = diffAcceptRejectHunk(diff, hunkIndex, { type: 'reject', changeIndex: 1 })
```

### 决策类型语义

| 决策 | 含义 | 结果 |
|---|---|---|
| `accept` | 采纳新版本 | hunk 从 diff 中移除，新内容并入"已接受"基准 |
| `reject` | 保留旧版本 | hunk 从 diff 中移除，旧内容保留 |
| `both` | 同时保留两侧 | hunk 从 diff 中移除，新旧内容都被并入（用于复杂合并） |

### 提取最终结果

每次 Accept/Reject 后，`diff.newFile.contents` 反映当前累积的"已决策版本"。完成所有 hunk 后保存即可：

```ts
async function commitDecisions(diff: FileDiffMetadata) {
  await api.saveFile(diff.newFile.filename, diff.newFile.contents)
}
```

## 完整 React Reviewer 模式

```tsx
import { useState, useMemo } from 'react'
import { FileDiff } from '@pierre/diffs/react'
import { parseDiffFromFile, diffAcceptRejectHunk } from '@pierre/diffs'

interface ReviewerProps {
  oldFile: FileContents
  newFile: FileContents
  onComplete: (finalContents: string) => void
}

export function Reviewer({ oldFile, newFile, onComplete }: ReviewerProps) {
  const [diff, setDiff] = useState(() => parseDiffFromFile(oldFile, newFile))

  const handleHunkDecision = (hunkIndex: number, decision: 'accept' | 'reject' | 'both') => {
    setDiff(prev => diffAcceptRejectHunk(prev, hunkIndex, decision))
  }

  const acceptAll = () => {
    let next = diff
    while (next.hunks.length > 0) {
      next = diffAcceptRejectHunk(next, 0, 'accept')
    }
    setDiff(next)
  }

  const rejectAll = () => {
    let next = diff
    while (next.hunks.length > 0) {
      next = diffAcceptRejectHunk(next, 0, 'reject')
    }
    setDiff(next)
  }

  // 当所有 hunks 都被处理后，diff.hunks 为空
  const allDecided = diff.hunks.length === 0

  // 在每个 hunk 起始行注入决策按钮
  const annotations = useMemo(() => diff.hunks.map((hunk, i) => ({
    line: hunk.newStart,
    side: 'right' as const,
    render: () => (
      <div style={{ display: 'flex', gap: 6, padding: 4 }}>
        <button onClick={() => handleHunkDecision(i, 'accept')} style={{ color: '#4ec9b0' }}>
          ✓ Accept
        </button>
        <button onClick={() => handleHunkDecision(i, 'reject')} style={{ color: '#f44747' }}>
          ✗ Reject
        </button>
        <button onClick={() => handleHunkDecision(i, 'both')}>
          ⇄ Both
        </button>
      </div>
    ),
  })), [diff])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={acceptAll}>全部接受</button>
        <button onClick={rejectAll}>全部拒绝</button>
        <span style={{ marginLeft: 'auto' }}>
          剩余 {diff.hunks.length} 个 hunk
        </span>
      </div>
      <FileDiff
        fileDiff={diff}
        options={{ theme: 'pierre-dark', layout: 'split' }}
        annotations={annotations}
      />
      {allDecided && (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <button onClick={() => onComplete(diff.newFile.contents)}>
            确认所有变更并保存
          </button>
        </div>
      )}
    </div>
  )
}
```

## 全部接受 / 全部拒绝

```ts
function acceptAllHunks(diff: FileDiffMetadata): FileDiffMetadata {
  let next = diff
  while (next.hunks.length > 0) {
    next = diffAcceptRejectHunk(next, 0, 'accept')
  }
  return next
}

function rejectAllHunks(diff: FileDiffMetadata): FileDiffMetadata {
  let next = diff
  while (next.hunks.length > 0) {
    next = diffAcceptRejectHunk(next, 0, 'reject')
  }
  return next
}
```

⚠️ 每次调用都创建一个新对象。批量处理时一次性完成循环再 `setState`，避免触发多次重渲染。

## 子变更（changeIndex）粒度操作

一个 hunk 内可能包含多个变更块（连续的删/加），`changeIndex` 允许针对单个变更块决策：

```ts
// hunk 0 内只接受第一个变更块（changeIndex 0）
const next = diffAcceptRejectHunk(diff, 0, { type: 'accept', changeIndex: 0 })

// 拒绝第二个变更块
const next2 = diffAcceptRejectHunk(next, 0, { type: 'reject', changeIndex: 1 })
```

当 `changeIndex` 用完，hunk 会自动从 `diff.hunks` 移除。适合 IDE 风格的精细审查。

### UI 模式：每个变更块单独的按钮组

```tsx
const annotations = diff.hunks.flatMap((hunk, hunkIndex) =>
  hunk.changes.map((change, changeIndex) => ({
    line: change.newStart,
    side: 'right' as const,
    render: () => (
      <ButtonGroup>
        <Button onClick={() => handleChange(hunkIndex, changeIndex, 'accept')}>✓</Button>
        <Button onClick={() => handleChange(hunkIndex, changeIndex, 'reject')}>✗</Button>
      </ButtonGroup>
    ),
  }))
)
```

> `change.newStart` / `change.changes` 字段名以实际 `FileDiffMetadata` 类型为准；如有出入请查阅 `@pierre/diffs` 的 TypeScript 定义。

## Merge Conflict 解决

含 Git 冲突标记的文件长这样：

```ts
const conflictedSource = `
function greet() {
<<<<<<< HEAD
  console.log('Hello from main')
=======
  console.log('Hello from feature')
>>>>>>> feature-branch
}
`
```

Pierre 提供两种处理路径：

1. **`<UnresolvedFile>` 组件**：开箱即用的解决 UI（推荐）
2. **`resolveMergeConflict` 函数**：编程式构造解决结果（自定义 UI）

## UnresolvedFile 组件

```tsx
import { UnresolvedFile } from '@pierre/diffs/react'

function ConflictResolver({ filename, conflictedCode, onResolved }) {
  const [resetKey, setResetKey] = useState(0)

  return (
    <div>
      <div style={{ padding: 8, borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => setResetKey(k => k + 1)}>重新开始</button>
      </div>

      <UnresolvedFile
        key={resetKey}                                  // ⚠️ uncontrolled，重置必须用 key
        file={{ filename, contents: conflictedCode }}
        options={{ theme: 'pierre-dark' }}
        onResolve={(resolvedContents) => onResolved(resolvedContents)}
      />
    </div>
  )
}
```

`UnresolvedFile` 自带"接受 Current / Incoming / Both" 等按钮 UI，所有冲突区块解决后会触发 `onResolve` 回调。

### 监听解决进度

```tsx
function ConflictWithProgress({ file, onResolved }) {
  const [resolved, setResolved] = useState(0)
  const [total, setTotal] = useState(0)

  return (
    <UnresolvedFile
      file={file}
      options={{ theme: 'pierre-dark' }}
      onProgress={({ resolvedHunks, totalHunks }) => {
        setResolved(resolvedHunks)
        setTotal(totalHunks)
      }}
      onResolve={onResolved}
    />
  )
}
```

## resolveMergeConflict 编程式 API

需要自定义 UI 或脚本化决策时使用：

```ts
import { resolveMergeConflict } from '@pierre/diffs'

const resolved: string = resolveMergeConflict(
  { filename: 'config.ts', contents: conflictedCode },
  [
    { hunkIndex: 0, choice: 'current'  },     // 接受 HEAD 一侧
    { hunkIndex: 1, choice: 'incoming' },     // 接受 feature 一侧
    { hunkIndex: 2, choice: 'both'     },     // 保留两侧
    { hunkIndex: 3, choice: 'none'     },     // 都不要（删除整段）
  ],
)

await api.saveFile('config.ts', resolved)
```

### 决策类型

| `choice` | 行为 |
|---|---|
| `current` | 保留 `<<<<<<< HEAD` 这一侧 |
| `incoming` | 保留 `>>>>>>> branch` 这一侧 |
| `both` | 顺序保留两侧（current 在前，incoming 在后） |
| `none` | 整段删除 |

### 自动化决策（脚本场景）

```ts
async function autoAcceptIncoming(filename: string, contents: string) {
  const conflictCount = countConflicts(contents)
  return resolveMergeConflict(
    { filename, contents },
    Array.from({ length: conflictCount }, (_, i) => ({
      hunkIndex: i,
      choice: 'incoming' as const,
    })),
  )
}
```

## 自定义解决 UI

不满足于内置 `UnresolvedFile` 时，自己组合 `File` + `resolveMergeConflict`：

```tsx
import { File } from '@pierre/diffs/react'
import { resolveMergeConflict } from '@pierre/diffs'

function CustomConflictResolver({ filename, conflictedCode, conflictCount, onSave }) {
  const [choices, setChoices] = useState<Array<'current' | 'incoming' | 'both' | 'none'>>(
    Array(conflictCount).fill('current')
  )

  const setChoice = (i: number, choice: typeof choices[number]) => {
    setChoices(prev => prev.map((c, idx) => idx === i ? choice : c))
  }

  const previewContents = useMemo(
    () => resolveMergeConflict(
      { filename, contents: conflictedCode },
      choices.map((choice, hunkIndex) => ({ hunkIndex, choice })),
    ),
    [filename, conflictedCode, choices],
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: '100%' }}>
      <aside style={{ padding: 12, borderRight: '1px solid var(--border-color)' }}>
        <h3>冲突列表</h3>
        {choices.map((choice, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <strong>冲突 #{i + 1}</strong>
            <select value={choice} onChange={e => setChoice(i, e.target.value as any)}>
              <option value="current">Current (HEAD)</option>
              <option value="incoming">Incoming</option>
              <option value="both">Both</option>
              <option value="none">删除</option>
            </select>
          </div>
        ))}
        <button onClick={() => onSave(previewContents)}>保存</button>
      </aside>

      <main>
        <File
          file={{ filename, contents: previewContents }}
          options={{ theme: 'pierre-dark' }}
        />
      </main>
    </div>
  )
}
```

## 典型场景

### 场景 1：AI 代码建议接受/拒绝

用户和 AI 协作编程时，AI 提议变更，用户逐 hunk 决策：

```tsx
function AISuggestionPanel({ originalFile, aiProposal, onSave }) {
  const reviewer = useRef<HTMLDivElement>(null)

  return (
    <Reviewer
      oldFile={originalFile}
      newFile={aiProposal}
      onComplete={(finalContents) => {
        onSave(finalContents)
        notifications.show({ message: '所有 AI 建议已处理完毕' })
      }}
    />
  )
}
```

### 场景 2：PR 审查（评论 + 接受）

PR 评论员可以决策每个 hunk：

```tsx
function PRReview({ pr }) {
  const [diff, setDiff] = useState(() => parseDiffFromFile(pr.base, pr.head))

  return (
    <FileDiff
      fileDiff={diff}
      options={{ theme: 'pierre-dark' }}
      annotations={[
        // 评论 annotations
        ...pr.comments.map(c => ({
          line: c.line,
          side: c.side,
          render: () => <CommentThread comment={c} />,
        })),
        // 决策 annotations
        ...diff.hunks.map((h, i) => ({
          line: h.newStart,
          side: 'right' as const,
          render: () => <HunkActions onAccept={() => setDiff(diffAcceptRejectHunk(diff, i, 'accept'))} />,
        })),
      ]}
    />
  )
}
```

### 场景 3：Git 冲突解决（命令行触发的 web 端）

CLI 工具检测到冲突时打开浏览器，用户在 web 端解决：

```tsx
function ConflictResolverApp() {
  const conflictFiles = useConflictFiles()

  return (
    <Tabs>
      {conflictFiles.map(f => (
        <Tab key={f.path} label={f.path}>
          <UnresolvedFile
            file={{ filename: f.path, contents: f.contents }}
            options={{ theme: 'pierre-dark' }}
            onResolve={async (resolved) => {
              await api.commitResolution(f.path, resolved)
              notifications.show({ message: `${f.path} 已解决` })
            }}
          />
        </Tab>
      ))}
    </Tabs>
  )
}
```

## 测试技巧

### 验证 Accept/Reject 结果

```ts
import { parseDiffFromFile, diffAcceptRejectHunk } from '@pierre/diffs'

const diff = parseDiffFromFile(
  { filename: 'a.ts', contents: 'const a = 1\nconst b = 2\n' },
  { filename: 'a.ts', contents: 'const a = 100\nconst b = 200\n' },
)

const accepted = diffAcceptRejectHunk(diff, 0, 'accept')
expect(accepted.newFile.contents).toBe('const a = 100\nconst b = 200\n')
expect(accepted.hunks).toHaveLength(0)

const rejected = diffAcceptRejectHunk(diff, 0, 'reject')
expect(rejected.newFile.contents).toBe('const a = 1\nconst b = 2\n')
```

### 验证 Conflict 解决

```ts
import { resolveMergeConflict } from '@pierre/diffs'

const conflict = `
<<<<<<< HEAD
A
=======
B
>>>>>>> feature
`

expect(resolveMergeConflict({ filename: 'x', contents: conflict }, [{ hunkIndex: 0, choice: 'current' }]))
  .toBe('\nA\n')
expect(resolveMergeConflict({ filename: 'x', contents: conflict }, [{ hunkIndex: 0, choice: 'incoming' }]))
  .toBe('\nB\n')
expect(resolveMergeConflict({ filename: 'x', contents: conflict }, [{ hunkIndex: 0, choice: 'both' }]))
  .toBe('\nA\nB\n')
```
