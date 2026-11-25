# 渲染状态图

用 npm 包 `pele@1.9.0` 渲染你展示的每个 `.mmd` 文件，并把 SVG 交给用户。在本技能的 scripts 目录按[运行环境](runtime.md)准备固定版本依赖。用 `--out` 把 SVG 写到目标项目的本轮 `temp/dev/` 目录，使用便于对应的文件名。完整调用方式为 `const { svg } = render(mermaidText, options)`，本技能的[渲染脚本](../scripts/render.mjs)执行该调用。向 `render` 传入 `{ limit: 1_000_000, outputLimit: 8_000_000, maxEdges: 10_000 }` 作为选项。Pele 的默认上限可能小于 500 个状态的图所需的上限。Pele 抛出 `PeleError` 时，向用户展示 Mermaid 文本与错误。

## 颜色

Pele 忽略 Mermaid 的 `theme` 和 `themeVariables`。在 `.pele` 上设置它的 `--pele-*` CSS 变量。下方完整列出本技能使用的主题变量与规则；[主题文件](../assets/theme.css)包含相同配色。命令为每个状态指定其分组的颜色类，例如 `class sN teal`。每个错误状态标为 `class sN breaks` 或 `class sN mayBreak`，通往缺陷的路径前缀上的状态标为 `class sN bugPath`，PROPERTY 反例中无限重复的每个状态标为 `class sN repeats`。状态不变量的路径按报告判断最短，时序反例不作全局最短承诺。Pele 把这些类加到状态节点上。使用 CSS 为这些类着色。

`.mmd` 文件中有 `breaks` 和 `mayBreak` 的 `classDef` 行，因此任何 Mermaid 查看器都能显示缺陷标记。文件不包含分组颜色、`bugPath` 或 `repeats` 的 `classDef`。Pele 把每个 `classDef` 颜色写成节点上的 `style` 属性，而 `style` 属性优先于普通 CSS 规则。因此，下面的标记规则使用 `!important`。如果没有它，深色主题会保留浅色标记颜色。缺陷标记设置填充色与文字色，`bugPath` 和 `repeats` 设置边框。把标记规则放在分组颜色之后，使标记覆盖分组颜色。

这些颜色是建议值。可以根据项目视觉规范调整。把它们放进每个 SVG 开头的 `<style>` 元素。这样每个 SVG 都会遵循查看器的浅色或深色设置。

```css
.pele {
  --pele-bg: #ffffff;
  --pele-fg: #1c1c1c;
  --pele-muted: #656565;
  --pele-line: #808080;
  --pele-surface: #fcfcfc;
  --pele-surface-alt: #f1f1f1;
  --pele-border: #c9c9c9;
}
.pele .blue rect { fill: #c3e0ff; }
.pele .orange rect { fill: #f0d3bf; }
.pele .purple rect { fill: #e3d5ff; }
.pele .yellow rect { fill: #f0dcbf; }
.pele .teal rect { fill: #bfe3df; }
.pele .tan rect { fill: #e5d9ce; }
.pele .pink rect { fill: #ffcbe6; }
.pele .breaks rect {
  fill: #ffecee !important;
  stroke: #e72e3b !important;
  stroke-width: 2.5px !important;
}
.pele .breaks text {
  fill: #cd2834 !important;
}
.pele .mayBreak rect {
  fill: #fff3e6 !important;
  stroke: #e8730c !important;
  stroke-width: 2.5px !important;
}
.pele .mayBreak text {
  fill: #b85a06 !important;
}
.pele .bugPath rect {
  stroke: #1680f3 !important;
  stroke-width: 2.5px !important;
}
.pele .repeats rect {
  stroke: #9b35d6 !important;
  stroke-width: 2.5px !important;
  stroke-dasharray: 6 3;
}
@media (prefers-color-scheme: dark) {
  .pele {
    --pele-bg: #1f1f1f;
    --pele-fg: #f5f5f5;
    --pele-muted: #acacac;
    --pele-line: #939393;
    --pele-surface: #121212;
    --pele-surface-alt: #2c2c2c;
    --pele-border: #4e4e4e;
  }
  .pele .blue rect { fill: #1b3857; }
  .pele .orange rect { fill: #573117; }
  .pele .purple rect { fill: #3c2e57; }
  .pele .yellow rect { fill: #573d17; }
  .pele .teal rect { fill: #174641; }
  .pele .tan rect { fill: #3d3127; }
  .pele .pink rect { fill: #57233e; }
  .pele .breaks rect {
    fill: #2e2021 !important;
    stroke: #cf2b35 !important;
  }
  .pele .breaks text {
    fill: #ff6463 !important;
  }
  .pele .mayBreak rect {
    fill: #2e2619 !important;
    stroke: #d0700f !important;
  }
  .pele .mayBreak text {
    fill: #ffa257 !important;
  }
  .pele .bugPath rect {
    stroke: #116dd2 !important;
  }
  .pele .repeats rect {
    stroke: #9a3fcf !important;
  }
}
```

## 本地命令

```sh
node "$SKILL_DIR/scripts/render.mjs" "$RUN_DIR/chart/chart.mmd" --out "$RUN_DIR/chart/chart.svg"
```

`RUN_DIR` 是目标项目根 `temp/dev/` 下本轮目录的绝对路径。必须显式传入 `.svg` 输出路径，已有文件不会被覆盖。复跑时选择新的运行目录。命令只读取本地 Mermaid、主题和渲染模块，不发送模型内容到远程服务。可以用 `STATECHART_PELE_MODULE` 指定已经安装的 Pele 入口文件绝对路径；否则读取 scripts 目录已安装的固定依赖。

原始 TLC 输出中的英文协议文本保持原样，便于复核；状态、箭头、报告与图例使用中文。渲染错误保留原始错误细节，不据此改变模型或属性。
