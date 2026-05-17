# 主题与 Shadow DOM 深度指南

Pierre Diffs 使用 Shadow DOM 隔离样式，外部 CSS 不会自动穿透。Trees 在 Light DOM，常规 CSS 即可生效。本文档覆盖三种自定义路径与跨包主题同步。

## 目录

- [Shadow DOM 基本原理](#shadow-dom-基本原理)
- [Diffs 自定义路径一：内置主题](#diffs-自定义路径一内置主题)
- [Diffs 自定义路径二：style prop（CSS 变量）](#diffs-自定义路径二style-propcss-变量)
- [Diffs 自定义路径三：unsafeCSS](#diffs-自定义路径三unsafecss)
- [自定义 Shiki 主题](#自定义-shiki-主题)
- [自定义语言](#自定义语言)
- [Trees 主题与 CSS 变量](#trees-主题与-css-变量)
- [跨包主题同步（themeToTreeStyles）](#跨包主题同步themetotreestyles)
- [暗黑模式切换](#暗黑模式切换)

## Shadow DOM 基本原理

Pierre Diffs 的每个组件挂载时，会在自身根节点附加一个 `shadowRoot`，所有 DOM 都生成在 Shadow 树内：

```
<pierre-diff>
  #shadow-root (open)
    <div data-diffs-root>
      <div data-diffs-line data-type="add">...</div>
      ...
    </div>
</pierre-diff>
```

**外部 CSS 选择器不会匹配 shadow 内的元素**，常见的样式覆盖手段都失效。Pierre 提供三条合规路径，按优先级使用。

## Diffs 自定义路径一：内置主题

最简单，性能最佳。直接用主题名：

```tsx
<MultiFileDiff options={{ theme: 'pierre-dark' }} />     // 默认深色
<MultiFileDiff options={{ theme: 'pierre-light' }} />    // 内置浅色
<MultiFileDiff options={{ theme: 'github-light' }} />    // 任意 Shiki 主题名
<MultiFileDiff options={{ theme: 'one-dark-pro' }} />
<MultiFileDiff options={{ theme: 'tokyo-night' }} />
```

可用主题列表：[shiki.style/themes](https://shiki.style/themes)。

## Diffs 自定义路径二：style prop（CSS 变量）

`style` prop 上的 CSS 属性会**直接穿透 Shadow DOM**（继承属性）或通过 `:host` CSS 变量传入：

```tsx
<MultiFileDiff
  style={{
    // 字体属性会自动继承到 shadow 内
    fontFamily: 'JetBrains Mono, Cascadia Code, monospace',
    fontSize: '13px',
    lineHeight: '20px',

    // 通过 :host CSS 变量传入（自定义属性）
    '--diffs-add-bg': 'rgba(0, 200, 0, 0.08)',
    '--diffs-remove-bg': 'rgba(255, 0, 0, 0.08)',
    '--diffs-line-number-color': '#888',
  } as React.CSSProperties}
/>
```

### Diffs 公开的 CSS 变量

| 变量 | 用途 |
|---|---|
| `--diffs-add-bg` | 新增行背景 |
| `--diffs-remove-bg` | 删除行背景 |
| `--diffs-add-line-bg` | 新增行内联高亮背景 |
| `--diffs-remove-line-bg` | 删除行内联高亮背景 |
| `--diffs-line-number-color` | 行号颜色 |
| `--diffs-hunk-bg` | hunk 分隔条背景 |
| `--diffs-hunk-color` | hunk 分隔条文字 |
| `--diffs-bg` | 整体背景 |
| `--diffs-fg` | 整体前景文字 |
| `--diffs-border-color` | 边框颜色 |
| `--diffs-header-bg` | header 区域背景 |
| `--diffs-header-fg` | header 区域文字 |

> 完整列表请参考官方文档（变量名称会随版本演进）。

## Diffs 自定义路径三：unsafeCSS

把任意 CSS 字符串注入 Shadow DOM。**仅在前两条路径无法满足时使用**：

```tsx
<MultiFileDiff
  options={{
    unsafeCSS: `
      [data-diffs-line][data-type="add"] {
        background: rgba(0, 200, 0, 0.1);
        border-left: 3px solid #2ea043;
      }
      [data-diffs-line][data-type="remove"] {
        background: rgba(220, 50, 50, 0.1);
        border-left: 3px solid #f85149;
      }
      [data-diffs-line]:hover {
        background: rgba(255, 255, 255, 0.04);
      }
    `,
  }}
/>
```

### unsafeCSS 选择器约束

✅ **优先**使用 `data-*` 属性选择器：

```css
[data-diffs-line][data-type="add"]
[data-diffs-line][data-side="right"]
[data-diffs-hunk]
[data-diffs-line-number]
```

❌ **避免**使用结构选择器（`div > div:nth-child(2)`）：内部 DOM 结构可能在版本升级时变化。

❌ **避免** `!important`：会冲突 Pierre 自身的优先级机制；使用更具体的选择器代替。

### 常见 data 属性参考

| 属性 | 取值 |
|---|---|
| `data-diffs-line` | 行容器（无值） |
| `data-type` | `add` / `remove` / `context` / `hunk-info` |
| `data-side` | `left` / `right`（仅 split 模式） |
| `data-line-number` | 行号 |
| `data-diffs-hunk` | hunk 容器 |
| `data-diffs-token` | 单个 token（启用 useTokenTransformer 后） |

## 自定义 Shiki 主题

接受 VS Code / Shiki 兼容的主题 JSON。

```ts
import { registerCustomTheme } from '@pierre/diffs'

import myThemeJson from './themes/corporate-dark.json'

registerCustomTheme(myThemeJson)

// 之后通过 myThemeJson.name 引用
<MultiFileDiff options={{ theme: myThemeJson.name }} />
```

### 主题 JSON 最小结构

```json
{
  "name": "corporate-dark",
  "type": "dark",
  "colors": {
    "editor.background": "#0d1117",
    "editor.foreground": "#c9d1d9"
  },
  "tokenColors": [
    { "scope": ["comment"], "settings": { "foreground": "#8b949e", "fontStyle": "italic" } },
    { "scope": ["keyword"], "settings": { "foreground": "#ff7b72" } },
    { "scope": ["string"],  "settings": { "foreground": "#a5d6ff" } }
  ]
}
```

完整字段参考 [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)。

## 自定义语言

```ts
import { registerCustomLanguage } from '@pierre/diffs'

import customLangGrammar from './grammars/my-dsl.tmLanguage.json'

registerCustomLanguage(customLangGrammar)

// 之后通过 setLanguageOverride 强制使用
import { setLanguageOverride } from '@pierre/diffs'

const file = setLanguageOverride(
  { filename: 'spec.dsl', contents: dslSource },
  'my-dsl',
)
```

支持 TextMate Grammar JSON 格式。

## Trees 主题与 CSS 变量

Trees 在 **Light DOM**，所有 CSS 变量直接覆盖即可生效：

```css
/* CSS 文件 */
.sidebar-tree {
  /* 面板配色 */
  --trees-background: #1e1e1e;
  --trees-foreground: #d4d4d4;
  --trees-border-color: #303030;

  /* 选中/聚焦/悬浮 */
  --trees-selection-background: rgba(99, 153, 34, 0.25);
  --trees-selection-foreground: #ffffff;
  --trees-focus-background: rgba(120, 170, 50, 0.4);
  --trees-hover-background: rgba(255, 255, 255, 0.04);

  /* Git 状态颜色 */
  --trees-git-added: #4ec9b0;
  --trees-git-modified: #e2c08d;
  --trees-git-deleted: #f44747;
  --trees-git-renamed: #4ec9b0;
  --trees-git-untracked: #6e9ee2;
  --trees-git-ignored: #6c6c6c;

  /* 尺寸 */
  --trees-item-height: 28px;
  --trees-density-override: 1;
  --trees-icon-size: 16px;
  --trees-indent-width: 12px;

  /* 字体 */
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}
```

```tsx
<FileTree model={model} className="sidebar-tree" />
```

### Trees 公开变量速查

| 变量 | 用途 |
|---|---|
| `--trees-background` | 面板背景 |
| `--trees-foreground` | 面板文字 |
| `--trees-border-color` | 边框 |
| `--trees-selection-background` | 选中背景 |
| `--trees-selection-foreground` | 选中文字 |
| `--trees-focus-background` | 焦点背景（区别选中） |
| `--trees-hover-background` | 悬浮背景 |
| `--trees-item-height` | 行高 |
| `--trees-density-override` | 密度倍数（覆盖 density 选项） |
| `--trees-icon-size` | 图标尺寸 |
| `--trees-indent-width` | 缩进单位宽度 |
| `--trees-git-added` / `--trees-git-modified` / `--trees-git-deleted` / `--trees-git-renamed` / `--trees-git-untracked` / `--trees-git-ignored` | Git 状态着色 |

## 跨包主题同步（themeToTreeStyles）

从一份 Shiki/VS Code 主题自动派生 Diffs 与 Trees 的样式，保证一致性：

```ts
import { themeToTreeStyles } from '@pierre/trees'
import myShikiTheme from './corporate-dark.json'

const treeStyles = themeToTreeStyles({
  type: 'dark',                            // 'light' | 'dark'
  bg: myShikiTheme.colors['editor.background'],
  fg: myShikiTheme.colors['editor.foreground'],
  colors: myShikiTheme.colors,             // 完整 Shiki colors 对象
})

// React
<FileTree model={model} style={treeStyles} />

// Vanilla
const container = tree.getFileTreeContainer()
Object.assign(container.style, treeStyles)
```

`themeToTreeStyles` 会从主题的颜色定义提取最佳匹配，生成 Trees CSS 变量对象。

### 单一主题源真相

```ts
// theme.ts —— 项目内统一主题入口
import { registerCustomTheme } from '@pierre/diffs'
import { themeToTreeStyles } from '@pierre/trees'
import corporateDark from './themes/corporate-dark.json'

registerCustomTheme(corporateDark)

export const APP_THEME = corporateDark.name
export const APP_TREE_STYLES = themeToTreeStyles({
  type: 'dark',
  bg: corporateDark.colors['editor.background'],
  fg: corporateDark.colors['editor.foreground'],
  colors: corporateDark.colors,
})
```

```tsx
import { APP_THEME, APP_TREE_STYLES } from './theme'

<MultiFileDiff options={{ theme: APP_THEME }} />
<FileTree model={model} style={APP_TREE_STYLES} />
```

## 暗黑模式切换

### 客户端切换（不刷新页面）

```tsx
function App() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark')
  const theme = colorScheme === 'dark' ? 'pierre-dark' : 'pierre-light'
  const treeStyles = useMemo(() => buildTreeStyles(colorScheme), [colorScheme])

  return (
    <WorkerPoolContextProvider workerFactory={...} options={{ theme }}>
      <FileTree model={model} style={treeStyles} />
      <MultiFileDiff options={{ theme }} oldFile={...} newFile={...} />
    </WorkerPoolContextProvider>
  )
}
```

⚠️ 切换主题时会重高亮所有可见 diff。启用 Worker Pool + cacheKey 可减少卡顿。

### 系统偏好跟随

```tsx
import { useEffect, useState } from 'react'

function useSystemColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return scheme
}
```

## 故障排查清单

| 现象 | 原因 | 修复 |
|---|---|---|
| 在 `:root` 里设置的 CSS 变量对 Diffs 无效 | Shadow DOM 不继承自定义属性（除非显式声明） | 通过 `style` prop 直接设置在组件上 |
| `unsafeCSS` 写了但没生效 | 选择器太具体或拼错 data 属性 | 用浏览器开发工具检查 Shadow Root，确认属性存在 |
| 字体在 Diffs 里仍是默认 | `font-family` 没继承（CSS 继承属性应自动穿透） | 检查 `style` prop 是否正确传递；不要用 `className` 上的字体 |
| Trees 主题切换时 Git 颜色没变 | 用了 `themeToTreeStyles` 缓存了对象 | 把 `colorScheme` 加进 useMemo 依赖 |
| 主题切换闪屏 | 同步换主题时整页重新高亮 | 启用 Worker Pool；或在切换瞬间显示 LoadingOverlay |
