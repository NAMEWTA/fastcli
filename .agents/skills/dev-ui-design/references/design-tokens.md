# 设计变量参考

创建或补齐设计系统时按需读取对应表。以下保留完整尺度、样式与语义色表；实际项目已有 token 时沿用其名称和值，记录必要对应，不为了采用默认表批量重命名。

这些名称是语义标识，可映射到 CSS 自定义属性、主题对象或宿主等价样式，例如 `spacing/75` → `--spacing-75`、`Surface/Primary` → `--surface-primary`。表中的逻辑单位在 Web 中为 CSS 像素，在其他宿主中使用对应布局单位。

## 目录

- [间距](#间距)
- [圆角](#圆角)
- [字号比例](#字号比例)
- [文本样式](#文本样式)
- [颜色](#颜色)
  - [原始色板](#第-1-层core-colors)
  - [语义颜色](#第-2-层color-system)


新系统使用下列完整默认值，颜色的十六进制值遵循用户品牌；已有项目采用已确认的设计约定。产品 UI 与营销页共用字号、行高和样式语义，标题字重按下方明确分支选择。

## 间距

`spacing` 为单一数值尺度，供内边距与 gap 共同引用。

| 设计变量 | 值 |
|---|---|
| spacing/0 | 0 |
| spacing/25 | 2 |
| spacing/50 | 4 |
| spacing/75 | 8 |
| spacing/100 | 12 |
| spacing/200 | 16 |
| spacing/300 | 24 |
| spacing/400 | 32 |
| spacing/500 | 40 |
| spacing/600 | 48 |
| spacing/700 | 64 |
| spacing/800 | 80 |
| spacing/900 | 96 |

## 圆角

`radius` 为圆角尺度；`full` 对应胶囊或圆形需要的足够大半径。

| 设计变量 | 值 |
|---|---|
| radius/0 | 0 |
| radius/2 | 2 |
| radius/4 | 4 |
| radius/6 | 6 |
| radius/8 | 8 |
| radius/12 | 12 |
| radius/16 | 16 |
| radius/24 | 24 |
| radius/full | 9999 |

## 字号比例

| 类名 | 字号 | 行高 |
|---|---|---|
| `text-xs` | 12px (0.75rem) | 16px |
| `text-sm` | 14px (0.875rem) | 20px |
| `text-base` | 16px (1rem) | 24px |
| `text-lg` | 18px (1.125rem) | 28px |
| `text-xl` | 20px (1.25rem) | 28px |
| `text-2xl` | 24px (1.5rem) | 32px |
| `text-3xl` | 30px (1.875rem) | 36px |
| `text-4xl` | 36px (2.25rem) | 40px |
| `text-5xl` | 48px (3rem) | 1 |
| `text-6xl` | 60px (3.75rem) | 1 |
| `text-7xl` | 72px (4.5rem) | 1 |
| `text-8xl` | 96px (6rem) | 1 |
| `text-9xl` | 128px (8rem) | 1 |

## 文本样式

字体沿用项目选定的单一字体家族。样式按语义分组，例如 `Heading / Heading 1`，代码可使用 `heading-1`。除非已有约定或用户设定，字距为 0。

**标题字重只选择一个适用约定。** 已有项目使用实际样式；新产品 UI 的 Heading 1–6 默认常规，新营销页的 Heading 1–6 默认半粗体。下表列出产品 UI 默认，营销页只覆盖这六行的字重，其他样式共用。不要在同一项目按文件来源混用字重。

常规、中等、半粗体通常对应 400、500、600；核对实际字体提供的字重，不能把浏览器合成结果当作已加载字体。

| 文件夹 / 样式 | 比例刻度 | 字号 / 行高 | 字重 |
|---|---|---|---|
| Heading / Heading 1 | `text-6xl` | 60 / 60 | 常规 |
| Heading / Heading 2 | `text-5xl` | 48 / 48 | 常规 |
| Heading / Heading 3 | `text-4xl` | 36 / 40 | 常规 |
| Heading / Heading 4 | `text-3xl` | 30 / 36 | 常规 |
| Heading / Heading 5 | `text-2xl` | 24 / 32 | 常规 |
| Heading / Heading 6 | `text-xl` | 20 / 28 | 常规 |
| Title / Title 1 | `text-xl` | 20 / 28 | 中等 |
| Title / Title 2 | `text-lg` | 18 / 28 | 中等 |
| Title / Title 3 | `text-base` | 16 / 24 | 中等 |
| Title / Title 4 | `text-sm` | 14 / 20 | 中等 |
| Title / Title 5 | `text-xs` | 12 / 16 | 中等 |
| Body / Body 1 | `text-base` | 16 / 24 | 半粗体 |
| Body / Body 2 | `text-base` | 16 / 24 | 中等 |
| Body / Body 3 | `text-base` | 16 / 24 | 常规 |
| Body / Body 4 | `text-sm` | 14 / 20 | 半粗体 |
| Body / Body 5 | `text-sm` | 14 / 20 | 中等 |
| Body / Body 6 | `text-sm` | 14 / 20 | 常规 |
| Button / Button-lg | `text-lg` | 18 / 28 | 半粗体 |
| Button / Button-md | `text-base` | 16 / 24 | 半粗体 |
| Button / Button-sm | `text-sm` | 14 / 20 | 半粗体 |
| Button / Button-Xsm | `text-xs` | 12 / 16 | 半粗体 |
| Caption / Caption 1 | `text-sm` | 14 / 20 | 中等 |
| Caption / Caption 2 | `text-sm` | 14 / 20 | 常规 |
| Caption / Caption 3 | `text-xs` | 12 / 16 | 半粗体 |
| Caption / Caption 4 | `text-xs` | 12 / 16 | 中等 |
| Caption / Caption 5 | `text-xs` | 12 / 16 | 常规 |

字体文件与可用字重因字体家族不同而不同。加载前检查项目资源和字体声明，渲染后核对实际字体；中文、数字与英文内容都需要可读的回退。

## 颜色

### 第 1 层：Core Colors

一个模式。原始十六进制颜色来自品牌。

| 色板 | 作用 | 色阶 |
|---|---|---|
| `Primary` | 主要品牌色 | 00, 50, 100, 150, 200, 300, 350, 400, 450, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Secondary` | 次要品牌色 | 00, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Accent` | 强调色 | 00, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Grayscale` | 中性色 | 00, 50, 100, 150, 200, 250, 300, 400, 450, 500, 600, 700, 750, 800, 850, 870, 900, 950, 1000 |
| `Red` | 错误 | 00, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Green` | 成功 | 00, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Yellow` | 警告 | 00, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000 |
| `Grayscale-Alpha` | 叠加层使用的透明中性色 | 700-16, 700-24, 700-40, 700-64, 700-80 （Grayscale/700 分别采用 16%、24%、40%、64%、80% 的 alpha，保存在颜色值内） |

- `00` 接近白色，`500` 为基础色相，`1000` 接近黑色。
- Grayscale 的深色阶与允许的深色背景保持对应：`1000` = #000000，`870` = #181818，`850` = #1F1F1F，`800` = #272727，`750` = #313131。

### 第 2 层：Color System

模式为 `Light` 和 `Dark`。每个值都是 Core Color 的别名。Dark 列是本表的默认参考映射。通过镜像色阶构建 Light 列，例如 Grayscale 870 的深色表面对应接近 Grayscale 00/50 的浅色表面，然后检查对比度。

**Border（边框）**

| 设计变量 | 深色模式别名 |
|---|---|
| Border/Primary | Grayscale/750 |
| Border/Primary-Disabled | Grayscale/800 |
| Border/Primary-light | Grayscale/700 |
| Border/Secondary | Grayscale/750 |
| Border/Tertiary | Grayscale/600 |
| Border/Action-Primary | Primary/400 |
| Border/Action-Disabled | Primary/600 |
| Border/Action-Secondary | Grayscale/500 |
| Border/Error | Red/400 |
| Border/Error-disabled | Red/700 |
| Border/Success | Green/400 |
| Border/Warning | Yellow/300 |
| Border/Warning - Disabled | Yellow/700 |

**Surface（表面）**

| 设计变量 | 深色模式别名 |
|---|---|
| Surface/Primary | Grayscale/870 |
| Surface/Primary-Hover | Grayscale/800 |
| Surface/Primary-Selected | Grayscale/700 |
| Surface/Primary-subtle | Grayscale/850 |
| Surface/Secondary | Grayscale/800 |
| Surface/Secondary-Hover | Grayscale/700 |
| Surface/Secondary-Selected | Grayscale/700 |
| Surface/Secondary-Subtle | Grayscale/750 |
| Surface/Tertiary | Grayscale/600 |
| Surface/Tertiary-Hover | Grayscale/450 |
| Surface/Accent | Accent/500 |
| Surface/Accent-subtle | Accent/200 |
| Surface/Info | Primary/400 |
| Surface/Info-subtle | Primary/150 |
| Surface/Error | Red/500 |
| Surface/Error-subtle | Red/100 |
| Surface/Error - Darker | Red/700 |
| Surface/Inverted | Grayscale/00 |
| Surface/Inverted-Hover | Grayscale/250 |
| Surface/Inverted-Disabled | Grayscale/450 |
| Surface/Warning | Yellow/500 |
| Surface/Warning-subtle | Yellow/100 |
| Surface/Warning - Hover | Yellow/700 |
| Surface/Success | Green/500 |
| Surface/Success-Subtle | Green/100 |

**Action（按钮和控件填充）**

| 设计变量 | 深色模式别名 |
|---|---|
| Action/Primary | Primary/500 |
| Action/Primary-Hover | Primary/700 |
| Action/Primary-Click | Primary/600 |
| Action/Primary-Disabled | Primary/700 |
| Action/Secondary | Grayscale/600 |
| Action/Secondary-Hover | Grayscale/750 |
| Action/Secondary-Click | Grayscale/700 |
| Action/Error | Red/700 |
| Action/Error-Hover | Red/800 |
| Action/Error-Disabled | Red/800 |
| Action/Error-Subtle | Red/150 |
| Action/Warning | Yellow/500 |
| Action/Warning - Hover | Yellow/700 |
| Action/Warning - Disabled | Yellow/800 |
| Action/Warning - Subtle | Yellow/100 |

**Text（文本）**

| 设计变量 | 深色模式别名 |
|---|---|
| Text/Primary | Grayscale/50 |
| Text/Primary-Disabled | Grayscale/750 |
| Text/Primary-Subtle | Grayscale/500 |
| Text/Secondary | Grayscale/200 |
| Text/Secondary-Disabled | Grayscale/500 |
| Text/Tertiary | Grayscale/400 |
| Text/Inverted | Grayscale/850 |
| Text/Error | Red/500 |
| Text/Error-Disabled | Red/800 |
| Text/Error-Inverted | Red/800 |
| Text/Error-Inverted-Disabled | Red/200 |
| Text/Success | Green/600 |
| Text/Success-Inverted | Green/700 |
| Text/Success-Inverted-Disabled | Green/300 |
| Text/Info | Primary/350 |
| Text/Info-Inverted | Primary/700 |
| Text/Info-Inverted-Disabled | Primary/200 |
| Text/Warning | Yellow/500 |
| Text/Warning - Disabled | Yellow/800 |
| Text/Warning-Inverted | Yellow/800 |
| Text/Warning-Inverted-Disabled | Yellow/300 |

**Icon（图标）**

| 设计变量 | 深色模式别名 |
|---|---|
| Icon/Default | Grayscale/50 |
| Icon/Secondary | Grayscale/200 |
| Icon/Subtle | Grayscale/500 |
| Icon/Inverted | Grayscale/850 |
| Icon/Disabled | Grayscale/750 |
| Icon/Error | Red/500 |
| Icon/Error-Disabled | Red/800 |
| Icon/Error-Inverted-Disabled | Red/200 |
| Icon/Info | Primary/350 |
| Icon/Info-Disabled | Primary/200 |
| Icon/Warning | Yellow/500 |
| Icon/Warning-Inverted | Yellow/700 |
| Icon/Warning - Disabled | Yellow/800 |
| Icon/Warning-Inverted-Disabled | Yellow/300 |
| Icon/Success | Green/400 |
| Icon/Success-Inverted-Disabled | Green/300 |

**Overlay（叠加层）**

| 设计变量 | 值 |
|---|---|
| Overlay/xs | Grayscale-Alpha/700-16 |
| Overlay/sm | Grayscale-Alpha/700-24 |
| Overlay/md | Grayscale-Alpha/700-40 |
| Overlay/lg | Grayscale-Alpha/700-64 |
| Overlay/xlg | Grayscale-Alpha/700-80 |

透明度保存在 Core Colors（`Grayscale-Alpha`）的颜色值内，Overlay 通过别名引用。不要给整个叠加容器设置 opacity，以免连带改变子内容的透明度。
