---
name: editorial-minimalism
type: ui-ux-rule
description: >-
  对标 Linear / Raycast / Arc 的 Editorial Minimalism 设计规范，用于工具类 / Dashboard / SaaS。
  约定 Tailwind + Framer Motion + Lucide、OKLCH、Accent-Dim、rounded-2xl、Bento Grid 布局。
  触发词：Linear 风格、Raycast、Arc、工具类 UI、高级感。
version: "1.0.0"
author: "wta"
---

# Editorial / Functional Minimalism 设计规范

面向工具类 / 效率类 / Dashboard 应用的 UI 风格——对标 Linear、Raycast、Arc Browser 的视觉语言。
核心主张：**用排版、留白、微妙边界和物理感动效做视觉区分，拒绝重阴影、拒绝模板化组件库、拒绝饱和色块堆砌。**

## Iron Law

> **禁止使用厚重阴影与饱和纯色作为主要分层手段。** 层级分隔必须优先走"圆角 + 边框 + 留白 + 背景色差"的组合；
> 任何 `shadow-lg` 及以上等级只允许出现在悬浮态（popover / dropdown / modal），静态卡片禁用。

## 1. 强制技术栈

| 角色 | 技术 | 约束 |
|------|------|------|
| 样式 | **Tailwind CSS** | 必须走原子类；禁止写业务级 CSS 文件；`@apply` 仅允许在 `@layer components` 中抽 ≥ 3 处复用的类 |
| 动效 | **Framer Motion**（`motion/react`） | 所有视图切换、模态框、tab 过渡、列表增删必须用 `motion` 组件；禁用裸 CSS transition 做主动效 |
| 图标 | **Lucide React** | 全站统一；禁止混用 Heroicons、Tabler、Material Icons；`strokeWidth={1.75}` 为默认值 |

**禁止引入：**Ant Design、Element Plus、MUI、Chakra 等"整套外观"的组件库。可用 Radix UI / Headless UI / shadcn-ui 这类无样式底座。

## 2. 色彩系统（OKLCH + Accent-Dim）

### 2.1 基座色板（写入全局 CSS 变量）

用 OKLCH 定义，亮度可控、跨色相过渡自然：

```css
@layer base {
  :root {
    --background:  oklch(0.99 0 0);         /* 近白，极低饱和 */
    --foreground:  oklch(0.15 0.01 270);    /* 墨色偏冷 */
    --muted:       oklch(0.96 0.005 270);
    --muted-foreground: oklch(0.55 0.02 270);
    --border:      oklch(0.92 0.005 270);   /* 极细边界，靠亮度差可见 */
    --accent:      oklch(0.62 0.19 265);    /* 品牌主色，中高饱和 */
    --accent-dim:  oklch(0.62 0.19 265 / 0.10); /* Accent-Dim：10% alpha */
  }
  .dark {
    --background:  oklch(0.17 0.01 270);
    --foreground:  oklch(0.96 0 0);
    --muted:       oklch(0.22 0.01 270);
    --muted-foreground: oklch(0.70 0.02 270);
    --border:      oklch(0.28 0.01 270);
    --accent:      oklch(0.68 0.18 265);
    --accent-dim:  oklch(0.68 0.18 265 / 0.14);
  }
}
```

在 `tailwind.config` 里把变量映射为 Tailwind 颜色，保证 `bg-background`、`text-foreground`、`border-border`、`bg-accent-dim` 都能用。

### 2.2 Accent-Dim 模式

**规则：** 品牌色的全饱和版本只用于关键 CTA 与高亮文字，其余一切"主题化"背景（选中项、当前 Tab、当前路由、Badge 底色）一律用 `bg-accent/10` 或 `bg-accent-dim`。

```tsx
// ✅ 正确：选中项用 accent-dim
<div className="bg-accent/10 text-accent rounded-xl px-3 py-1.5">收件箱</div>

// ❌ 错误：选中项用饱和色，视觉疲劳
<div className="bg-blue-600 text-white rounded-xl px-3 py-1.5">收件箱</div>
```

### 2.3 禁用清单

- 不用 `bg-gray-*`、`bg-slate-*` 等 Tailwind 默认调色盘做主要背景；走 CSS 变量以便统一主题。
- 不用纯黑 `#000` 做文字；深色也走 OKLCH 亮度 0.15 左右的冷墨。
- 不用 `bg-white` 直接做卡片底；用 `bg-background` 或 `bg-card` 走变量。

## 3. 圆角、边框与层级

### 3.1 圆角阶梯

| 阶 | Tailwind | 用途 |
|----|----------|------|
| 小 | `rounded-lg`（0.5rem） | 输入框、小按钮、小 Badge |
| 中 | `rounded-xl`（0.75rem） | 按钮、Tab、列表项 |
| **大** | **`rounded-2xl`（1rem）** | **卡片、模态框、侧边栏内块——默认首选** |
| 特大 | `rounded-3xl`（1.5rem） | 大型 Hero 区块、欢迎卡片 |
| 全圆 | `rounded-full` | 头像、图标按钮、Pill 标签 |

**默认卡片用 `rounded-2xl`。** 这是本风格的签名式细节。

### 3.2 分层手段（按优先级）

1. **圆角 + 细边框**：`border border-border rounded-2xl`——首选方案
2. **背景色差**：`bg-muted` 对 `bg-background`——次选
3. **细微投影**：`shadow-sm` 做卡片微浮感——谨慎用
4. **厚投影**：`shadow-lg` / `shadow-xl`——**仅限浮层（popover / modal / dropdown）**

```tsx
// ✅ 静态卡片
<div className="bg-background border border-border rounded-2xl p-6">...</div>

// ✅ 浮层
<motion.div className="bg-background border border-border rounded-2xl shadow-xl p-4">...</motion.div>

// ❌ 静态卡片上硬怼重阴影
<div className="bg-white rounded-lg shadow-xl p-6">...</div>
```

### 3.3 边框规范

- 颜色只用 `border-border`（变量驱动），禁止写死 `border-gray-200`。
- 宽度统一 `1px`；分割线用 `divide-y divide-border` 或 `border-t border-border`，不用 `border-2`。

## 4. 排版驱动（Typography-First）

信息密度由排版承担，而不是靠颜色块或图标堆。

### 4.1 字体栈

```ts
fontFamily: {
  sans: ['Inter', 'PingFang SC', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
  serif: ['"Source Serif 4"', 'Georgia', 'serif'], // 可选：大标题/引语
}
```

### 4.2 标题：tracking-tight

大号文字必须收紧字距，营造书籍排版感：

```tsx
<h1 className="text-3xl font-semibold tracking-tight">今日日程</h1>
<h2 className="text-xl font-medium tracking-tight">未完成</h2>
```

**阈值：** `text-lg` 及以上一律加 `tracking-tight`；`text-base` 及以下保持默认字距。

### 4.3 数字等宽

**所有数据型数字必须用等宽字体**——提醒时间、倒计时、统计值、版本号、Kbd 快捷键。

```tsx
<span className="font-mono text-sm tabular-nums">14:30</span>
<span className="font-mono text-2xl tracking-tight">127</span>
<kbd className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-muted border border-border">⌘K</kbd>
```

`tabular-nums` 保证数字列对齐（尤其计时器、表格）。

### 4.4 正文尺寸

| 场景 | Tailwind | 行高 |
|------|----------|------|
| 正文 | `text-sm` 或 `text-base` | `leading-relaxed`（1.625） |
| 辅助文字 | `text-xs text-muted-foreground` | 默认 |
| 大号标题 | `text-3xl` ~ `text-5xl` | `leading-tight` |

**禁用：** `text-xs` 不要用于正文，仅辅助信息；正文最小 `text-sm`。

## 5. 动效规范（Framer Motion）

### 5.1 触发场景清单

| 场景 | 必须用 Motion？ |
|------|----------------|
| 视图切换（路由 / Tab 切换） | ✅ 必须 |
| 模态框 / Drawer / Popover 入场出场 | ✅ 必须 |
| 列表项增删 | ✅ 必须（`AnimatePresence`） |
| 详情页展开 / 折叠 | ✅ 必须 |
| Hover 态微交互（scale / translate） | ⭕ 可选，简单 case 用 CSS `transition` 也行 |

### 5.2 默认 Spring 预设

抛弃线性 / 贝塞尔；用弹簧动效体现"物理感"：

```tsx
const spring = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 };

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={spring}
/>
```

- **入场位移** 8px ~ 16px，不要过大（高端工具感要"克制"）。
- **时长感知** 200~280ms，Spring 参数比硬编码 duration 更自然。

### 5.3 Tab 切换：共享布局动画

```tsx
<AnimatePresence mode="wait">
  <motion.div key={activeTab} {...fadeSlide}>
    {content}
  </motion.div>
</AnimatePresence>
```

选中指示器用 `layoutId` 让滑块物理地"滑过去"，而不是闪切。

### 5.4 禁用清单

- 禁止旋转（`rotate`）作为主要进场动效——容易廉价化。
- 禁止弹跳过大（`damping < 20`）——不稳重。
- 禁止动效时长 > 400ms 的非手动交互——慢就是卡。

## 6. 图标规范（Lucide）

```tsx
import { Calendar, Check, Search } from 'lucide-react';

<Calendar size={16} strokeWidth={1.75} className="text-muted-foreground" />
```

- **默认 `strokeWidth={1.75}`**；正文内联图标 `size={16}`；导航/Tab 图标 `size={18}`；大号场景 `size={20}`。
- **禁止混用图标库**——Lucide 与其他库（Heroicons/Tabler）的描边权重差异会立刻暴露"拼凑感"。
- **图标颜色**只用 `text-foreground` / `text-muted-foreground` / `text-accent`，不用花色。

## 7. 布局骨架

### 7.1 二段式：Sticky Sidebar + Main Stage

```tsx
<div className="flex h-dvh bg-background">
  <aside className="w-60 shrink-0 sticky top-0 h-dvh border-r border-border px-3 py-4">
    {/* 高频操作垂直排列：待办 / 日历 / 档案 */}
  </aside>
  <main className="flex-1 overflow-y-auto px-8 py-6">{/* 主视图 */}</main>
</div>
```

- 侧边栏宽度 `w-56` ~ `w-64`；顶部留 `py-4`，导航项之间 `gap-1`。
- 侧边栏与主区用 `border-r border-border` 分隔，**不要用阴影分栏**。
- 主区左右内边距 ≥ `px-8`，标题区与内容区之间 `py-6` ~ `py-8`，**留白是风格的一部分**。

### 7.2 三段式：Sidebar + List + Detail

邮件/待办/聊天类应用常用——左侧导航、中间列表、右侧详情：

```tsx
<div className="grid h-dvh grid-cols-[15rem_22rem_1fr]">
  <Sidebar />
  <ListPane className="border-x border-border" />
  <DetailPane />
</div>
```

### 7.3 Bento Grid：详情页自适应

**档案/Profile/详情视图** 自动切换为 Bento Grid——用不等大的卡片分块承载异构信息，替代单一长列表：

```tsx
<div className="grid grid-cols-6 gap-4 auto-rows-[minmax(8rem,auto)]">
  <Card className="col-span-4 row-span-2">{/* 主信息：头像 + 简介 */}</Card>
  <Card className="col-span-2">{/* 数字统计 */}</Card>
  <Card className="col-span-2">{/* 最近活动 */}</Card>
  <Card className="col-span-3">{/* 标签云 */}</Card>
  <Card className="col-span-3">{/* 关系图谱 */}</Card>
</div>
```

- 卡片统一 `rounded-2xl border border-border p-5 bg-background`。
- `col-span` 按信息重要度分配：主角 4~6 列，辅助 2~3 列。
- 响应式：`md:grid-cols-6` → `grid-cols-2` → `grid-cols-1`。

### 7.4 容器最大宽度

阅读型内容（文档、设置页）主区最大 `max-w-3xl`（约 48rem），避免文字单行过长。数据密集型（表格、Dashboard）可用 `max-w-7xl` 或全宽。

## 8. 组件级惯例

| 组件 | 惯例 |
|------|------|
| **按钮主** | `h-9 rounded-xl px-4 bg-foreground text-background font-medium text-sm`，hover 时 `opacity-90`，不用饱和背景色 |
| **按钮次** | `h-9 rounded-xl px-4 border border-border bg-background hover:bg-muted` |
| **输入框** | `h-9 rounded-xl border border-border bg-background px-3 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent` |
| **Kbd 快捷键** | `font-mono text-xs px-1.5 py-0.5 rounded-md bg-muted border border-border` |
| **Badge** | `rounded-full text-xs px-2 py-0.5 bg-accent/10 text-accent`（不用纯色背景） |
| **分割线** | `h-px bg-border`，**不用 `<hr>` 的默认样式** |
| **Loading** | 用 Framer Motion `animate={{ opacity: [0.4, 1, 0.4] }}` 呼吸；不用旋转菊花 |

## 9. 可访问性底线

- 交互元素的对比度 ≥ WCAG AA（`text-muted-foreground` 必须在两种主题下都通过 4.5:1）。
- 所有可点击/可聚焦元素必须有 `focus-visible` 环：`focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background`。
- 图标按钮必须有 `aria-label`；`Lucide` 图标加 `aria-hidden="true"` 作为装饰用途。

## 10. 风格自检清单

提交或 Review UI 代码前逐条确认：

- [ ] 技术栈是 Tailwind + Framer Motion + Lucide，没有混用组件库
- [ ] 色板走 CSS 变量（OKLCH），没有直接写 `bg-gray-*` / `#hex`
- [ ] 选中态、当前 Tab、Badge 底色全部用 `bg-accent/10` 或 `bg-accent-dim`
- [ ] 卡片默认 `rounded-2xl border border-border`，没有 `shadow-lg` 或以上
- [ ] 所有浮层（Popover/Modal/Dropdown）用 Framer Motion 入场出场
- [ ] `text-lg` 及以上标题加了 `tracking-tight`
- [ ] 所有数字（时间、统计、Kbd）用 `font-mono tabular-nums`
- [ ] Lucide 图标 `strokeWidth={1.75}`，没有混用其他图标库
- [ ] 布局采用二段 / 三段分栏或 Bento Grid，没有堆到单栏
- [ ] 侧边栏与主区用边框分隔，不用阴影
- [ ] 交互元素有 `focus-visible` 环，图标按钮有 `aria-label`

## 11. 常见反模式

| 反模式 | 说明 | 正确做法 |
|--------|------|---------|
| 卡片用 `shadow-md` / `shadow-lg` | 立刻破坏高级感，像 Bootstrap 模板 | `border border-border rounded-2xl` |
| 选中项用 `bg-blue-600 text-white` | 饱和色堆砌，视觉疲劳 | `bg-accent/10 text-accent` |
| 数字用普通 `sans` 字体 | 排版不整齐，失去"精密"感 | `font-mono tabular-nums` |
| 标题不加 `tracking-tight` | 字距松散，像默认 HTML | 大号文字一律 `tracking-tight` |
| 视图切换硬切无动效 | 失去物理感 | 用 `AnimatePresence` + Spring |
| 混用图标库 | 线条粗细不一，立即廉价 | 全站只用 Lucide，统一 `strokeWidth` |
| 全部卡片等宽堆叠 | 信息层次扁平 | 详情页用 Bento Grid 分配 `col-span` |
| 色值写死 `#f5f5f5` | 无法做深色模式、无法主题化 | 走 CSS 变量 `bg-background` / `border-border` |
