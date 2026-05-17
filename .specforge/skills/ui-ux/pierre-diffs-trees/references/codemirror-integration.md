# 与 CodeMirror 6 集成

Diffs（Shadow DOM）和 CM6（Light DOM）共存的工程模式。本文档覆盖完整 IDE 三栏布局、字体/主题对齐、焦点管理、生命周期协调。

## 目录

- [常见拓扑](#常见拓扑)
- [完整三栏 IDE 布局](#完整三栏-ide-布局)
- [字体与尺寸对齐](#字体与尺寸对齐)
- [主题同步](#主题同步)
- [焦点管理](#焦点管理)
- [CM6 实例生命周期](#cm6-实例生命周期)
- [Edit ⇄ Diff 切换模式](#edit--diff-切换模式)
- [常见陷阱](#常见陷阱)

## 常见拓扑

| 拓扑 | 描述 | 使用场景 |
|---|---|---|
| Tree + Editor | 左侧文件树，右侧 CM6 编辑器 | 简易代码编辑器 |
| Tree + Editor / Diff Tab | 左侧树，右侧 Tab 切换编辑/对比 | PR 审查 + 编辑 |
| Tree + Editor + Diff Drawer | 编辑时悬浮 Diff 面板对比未保存修改 | 草稿/草改对比 |
| Editor + Inline Diff | 编辑器内嵌 Diff 显示 AI 建议 | AI 协同编程 |

## 完整三栏 IDE 布局

```tsx
import { useFileTree, FileTree, useFileTreeSelection } from '@pierre/trees/react'
import { MultiFileDiff } from '@pierre/diffs/react'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { useEffect, useRef, useState, useMemo } from 'react'

type ViewMode = 'edit' | 'diff'

export function IDELayout({ files, gitStatus }: Props) {
  // 1. 文件树
  const { model } = useFileTree({
    paths: files.map(f => f.path),
    icons: 'standard',
    gitStatus,
    flattenEmptyDirectories: true,
    onSelectionChange: (paths) => {
      // 不在这里 setState 切换文件，避免与树自身的状态联动；用 selectedPaths 单向派生
    },
  })

  const selectedPaths = useFileTreeSelection(model)
  const activePath = selectedPaths[0]
  const activeFile = useMemo(
    () => files.find(f => f.path === activePath),
    [files, activePath],
  )

  // 2. 视图模式
  const [mode, setMode] = useState<ViewMode>('edit')

  // 3. CodeMirror 6 实例
  const editorContainer = useRef<HTMLDivElement>(null)
  const editorView = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!editorContainer.current || !activeFile || mode !== 'edit') return

    // 切换文件时销毁旧实例
    editorView.current?.destroy()
    editorView.current = new EditorView({
      doc: activeFile.contents,
      extensions: [basicSetup, javascript({ typescript: true })],
      parent: editorContainer.current,
    })

    return () => {
      editorView.current?.destroy()
      editorView.current = null
    }
  }, [activePath, mode])   // ⚠️ 依赖 activePath 而非 activeFile（避免对象引用变化导致重建）

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'inherit' }}>
      {/* 左：文件树 */}
      <FileTree
        model={model}
        tabIndex={0}
        style={{
          width: 260,
          height: '100%',
          borderRight: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      />

      {/* 右：主区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tab 栏 */}
        <div style={{
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 12px',
          display: 'flex',
          gap: 8,
        }}>
          <button onClick={() => setMode('edit')} aria-pressed={mode === 'edit'}>Edit</button>
          <button onClick={() => setMode('diff')} aria-pressed={mode === 'diff'}>Diff</button>
        </div>

        {/* CM6 编辑器 */}
        <div
          ref={editorContainer}
          style={{
            flex: 1,
            overflow: 'auto',
            display: mode === 'edit' ? 'block' : 'none',   // ⚠️ 用 display 而非卸载，避免 CM6 状态丢失
          }}
        />

        {/* Diff 视图 */}
        {mode === 'diff' && activeFile?.originalContents && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <MultiFileDiff
              oldFile={{ filename: activePath, contents: activeFile.originalContents }}
              newFile={{ filename: activePath, contents: activeFile.contents }}
              options={{ theme: 'pierre-dark', layout: 'split' }}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                lineHeight: '20px',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

## 字体与尺寸对齐

跨 Shadow DOM 边界（CM6 在 Light DOM、Diffs 在 Shadow DOM）保持视觉一致的关键：

```css
/* 全局定义一组代码字体常量 */
:root {
  --code-font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
  --code-font-size: 13px;
  --code-line-height: 20px;
}
```

### CM6 主题（设置字体）

```ts
import { EditorView } from '@codemirror/view'

const codeStyle = EditorView.theme({
  '&': { fontFamily: 'var(--code-font-family)', fontSize: 'var(--code-font-size)' },
  '.cm-content': { lineHeight: 'var(--code-line-height)', fontFamily: 'inherit' },
  '.cm-gutters': { fontFamily: 'inherit', fontSize: 'inherit' },
})

new EditorView({
  doc,
  extensions: [basicSetup, javascript(), codeStyle],
  parent,
})
```

### Diffs（通过 style prop 透传）

```tsx
<MultiFileDiff
  style={{
    fontFamily: 'var(--code-font-family)',
    fontSize: 'var(--code-font-size)',
    lineHeight: 'var(--code-line-height)',
  } as React.CSSProperties}
/>
```

切换 Edit ⇄ Diff 时不会出现行高跳动。

## 主题同步

### 单源主题派生

把 CM6 的 highlight 主题转换为可同步给 pierre 的颜色集合。最干净的做法是用 Shiki 主题作为单一来源：

```ts
// theme.ts
import { registerCustomTheme } from '@pierre/diffs'
import { themeToTreeStyles } from '@pierre/trees'
import corporateDark from './themes/corporate-dark.json'

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// 1. 注册到 pierre
registerCustomTheme(corporateDark)
export const PIERRE_THEME = corporateDark.name

// 2. 派生 Trees CSS 变量
export const TREE_STYLES = themeToTreeStyles({
  type: 'dark',
  bg: corporateDark.colors['editor.background'],
  fg: corporateDark.colors['editor.foreground'],
  colors: corporateDark.colors,
})

// 3. 派生 CM6 主题
const tokenColor = (scope: string) =>
  corporateDark.tokenColors.find(t => t.scope?.includes(scope))?.settings.foreground

const cmHighlight = HighlightStyle.define([
  { tag: t.keyword,    color: tokenColor('keyword') },
  { tag: t.string,     color: tokenColor('string') },
  { tag: t.comment,    color: tokenColor('comment'), fontStyle: 'italic' },
  { tag: t.function(t.variableName), color: tokenColor('entity.name.function') },
  { tag: t.typeName,   color: tokenColor('entity.name.type') },
  { tag: t.number,     color: tokenColor('constant.numeric') },
])

export const CM_THEME = [
  EditorView.theme({
    '&': {
      backgroundColor: corporateDark.colors['editor.background'],
      color: corporateDark.colors['editor.foreground'],
    },
    '.cm-gutters': {
      backgroundColor: corporateDark.colors['editorGutter.background'] ?? 'transparent',
      borderRight: 'none',
    },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  }, { dark: true }),
  syntaxHighlighting(cmHighlight),
]
```

### 使用

```tsx
import { PIERRE_THEME, TREE_STYLES, CM_THEME } from './theme'

// FileTree
<FileTree model={model} style={TREE_STYLES} />

// CM6
new EditorView({ doc, extensions: [basicSetup, javascript(), CM_THEME], parent })

// Diffs
<MultiFileDiff options={{ theme: PIERRE_THEME }} />
```

### 运行期 CM6 → Diffs 主题同步（备用方案）

如果暂时无法迁移到单源主题，可从已渲染的 CM6 实例提取计算样式：

```ts
import { EditorView } from '@codemirror/view'

export function readCM6ComputedStyle(view: EditorView) {
  const styles = getComputedStyle(view.dom)
  return {
    diffsStyle: {
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
    },
    treesStyle: {
      '--trees-background': styles.backgroundColor,
      '--trees-foreground': styles.color,
    } as React.CSSProperties,
  }
}
```

注意：computed style 同步是运行期采样，初次渲染会有一帧不一致；尽量用单源主题派生。

## 焦点管理

CM6 与 Trees 都消费方向键，需明确边界：

```tsx
<FileTree
  model={model}
  tabIndex={0}                                  // Trees 容器需可聚焦才能接收键盘
  onKeyDown={(e) => {
    // Trees 自身处理上下方向键，这里不要拦截
    if (e.key === 'Enter') {
      // 切换到编辑模式并聚焦 CM6
      setMode('edit')
      // 延迟到下一帧聚焦，避免与 Trees 自身事件冲突
      requestAnimationFrame(() => editorView.current?.focus())
    }
  }}
/>
```

```ts
// CM6 的 Esc 返回 Trees
import { keymap } from '@codemirror/view'

const focusBackToTree = keymap.of([{
  key: 'Escape',
  run: () => {
    document.querySelector<HTMLElement>('.sidebar-tree')?.focus()
    return true
  },
}])

new EditorView({
  doc,
  extensions: [basicSetup, focusBackToTree, javascript()],
  parent,
})
```

### 防止 Trees 抢走 CM6 的快捷键

如果 Trees 容器上注册了全局热键（如 `Cmd+P` 打开搜索），确保只在 Trees 拥有焦点或 `target` 不在 CM6 内时触发：

```ts
useHotkeys([
  ['mod+P', (e) => {
    if (editorView.current?.dom.contains(e.target as Node)) return  // CM6 内不处理
    model.openSearch()
  }],
])
```

## CM6 实例生命周期

CM6 不像 React 那样是声明式的，文档变化、扩展替换都需要命令式调用。**关键约定**：

1. **切换文件**：销毁旧 `EditorView`，创建新实例（不要调用 `view.setState`）
2. **更新文档**：用 `view.dispatch({ changes })`，不重建实例
3. **保留状态**：模式切换用 `display: none`，不要卸载组件（否则光标位置和撤销栈丢失）

```tsx
// ❌ 错：每次重建丢失光标和撤销栈
useEffect(() => {
  editorView.current = new EditorView({ doc: activeFile.contents, ... })
}, [activeFile.contents])

// ✅ 对：仅在文件路径变化时重建
useEffect(() => {
  editorView.current?.destroy()
  editorView.current = new EditorView({ doc: activeFile.contents, ... })
}, [activePath])
```

### 外部修改文档的正确方式

```ts
// 远程协同推过来的变更
function applyRemoteChange(view: EditorView, from: number, to: number, insert: string) {
  view.dispatch({
    changes: { from, to, insert },
    annotations: [Transaction.userEvent.of('remote')],   // 标记为远程，避免本地撤销
  })
}
```

## Edit ⇄ Diff 切换模式

### 模式 A：Tab 切换（推荐）

如上文 IDE 示例。优点：CM6 状态保留；缺点：占满主区域。

### 模式 B：分栏对比

```tsx
function SplitView({ activeFile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, borderBottom: '1px solid var(--border-color)' }} ref={editorRef} />
      <div style={{ flex: 1 }}>
        <MultiFileDiff
          oldFile={{ filename: activeFile.path, contents: activeFile.originalContents }}
          newFile={{ filename: activeFile.path, contents: activeFile.contents }}
          options={{ theme: PIERRE_THEME, layout: 'stacked' }}
        />
      </div>
    </div>
  )
}
```

⚠️ Diff 不会自动跟随 CM6 的最新内容——必须手动同步。

### Diff 跟随 CM6 内容更新

```tsx
function LiveDiff({ view, originalContents, filename }) {
  const [currentContents, setCurrentContents] = useState(originalContents)

  useEffect(() => {
    if (!view) return
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setCurrentContents(update.state.doc.toString())
      }
    })
    // 注：CM6 的 updateListener 应在 EditorView 创建时通过 extensions 注入
    // 这里仅示意，实际实现应放进 view 的 extensions 数组
  }, [view])

  return (
    <MultiFileDiff
      oldFile={{ filename, contents: originalContents }}
      newFile={{ filename, contents: currentContents }}
      options={{ theme: PIERRE_THEME }}
    />
  )
}
```

性能提示：在 CM6 的 `updateListener` 里使用 `setState` 防抖（200–500ms），避免每次按键都重渲染 Diff。

### 模式 C：内嵌 AI 建议（实验）

```tsx
function CodeWithSuggestion({ originalCode, aiProposal, filename }) {
  const [accepted, setAccepted] = useState(false)
  if (!aiProposal) return <Editor doc={originalCode} />
  if (accepted)    return <Editor doc={aiProposal} />
  return (
    <FileDiff
      fileDiff={parseDiffFromFile(
        { filename, contents: originalCode },
        { filename, contents: aiProposal },
      )}
      options={{ theme: PIERRE_THEME, layout: 'stacked' }}
      annotations={[{
        line: 1,
        side: 'right',
        render: () => (
          <Group>
            <Button onClick={() => setAccepted(true)}>Accept</Button>
            <Button variant="subtle">Reject</Button>
          </Group>
        ),
      }]}
    />
  )
}
```

更完整的 Accept/Reject 流程见 [accept-reject-and-conflicts.md](./accept-reject-and-conflicts.md)。

## 常见陷阱

| 问题 | 解决 |
|---|---|
| 切换 Tab 时 CM6 光标丢失 | 用 `display: none` 而非卸载组件 |
| Diff 与 CM6 行高不一致，切换抖动 | 共享 `--code-line-height` CSS 变量；两边都设置 |
| CM6 主题深，Diff 主题浅 | 改用单源主题派生（见上文 theme.ts） |
| Tree 的方向键被 CM6 截获 | 检查 CM6 是否有焦点；使用 `tabIndex` + `requestAnimationFrame` 协调 |
| 远程协同 + CM6：撤销栈乱 | 远程变更用 `annotations: [Transaction.userEvent.of('remote')]` 区分 |
| Diff 跟 CM6 实时同步太慢 | 在 `updateListener` 里防抖 200–500ms |
| 多文件 PR 视图 + CM6：内存爆炸 | Diff 用 `<Virtualizer>`；CM6 仅渲染当前活跃文件 |
