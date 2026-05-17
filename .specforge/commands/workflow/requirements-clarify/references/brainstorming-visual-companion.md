# 视觉伴侣指南

> 基于浏览器的视觉头脑风暴伴侣，用于展示原型、图表和选项。当涉及视觉/布局/架构问题时使用。

## 何时使用

**判断标准**: 用户看到它是否比读到它更容易理解？

**使用视觉伴侣的场景**：
- UI 原型（线框图、布局、导航结构、组件设计）
- 架构图（系统组件、数据流、关系图）
- 并排视觉对比（对比两种布局、两种配色方案、两种设计方向）
- 设计细节打磨（外观感受、间距、视觉层次）
- 空间关系（状态机、流程图、实体关系图）

**使用终端的场景**：
- 需求和范围问题（"X 是什么意思？"、"哪些功能在范围内？"）
- 概念性 A/B/C 选择（在用文字描述的方案之间做选择）
- 权衡列表、优缺点、对比表
- 技术决策（API 设计、数据建模、架构方案选择）
- 澄清问题（任何回答是文字而非视觉偏好的问题）

**注意**：关于 UI 主题的问题不一定是视觉问题。
- "你想要什么样的向导？" → 概念性的 → 使用终端
- "这些向导布局中哪个感觉对？" → 视觉性的 → 使用浏览器

---

## 工作循环

1. **启动服务**（如果需要）
   - 检查视觉伴侣服务是否运行
   - 如未运行，启动服务并获取 URL

2. **写入 HTML 内容**
   - 使用语义化文件名：`platform.html`、`visual-style.html`、`layout.html`
   - **绝不复用文件名** — 每个屏幕用一个新文件
   - 迭代版本：添加版本后缀如 `layout-v2.html`、`layout-v3.html`

3. **告知用户**
   - 每一步都提醒他们 URL（不仅仅是第一次）
   - 简要文字说明屏幕上的内容（例如"展示了 3 个首页布局选项"）
   - 请他们在终端中回复："看一下，告诉我你的想法。如果你愿意，可以点击选择一个选项。"

4. **读取用户反馈**
   - 用户在终端回复后，读取事件文件（如存在）
   - 将终端文字和事件合并以获得完整信息
   - 终端消息是主要反馈；事件文件提供结构化的交互数据

5. **迭代或推进**
   - 如果反馈要求修改当前屏幕，写入新文件（例如 `layout-v2.html`）
   - 只有当前步骤验证通过后才进入下一个问题

6. **回到终端时卸载**
   - 当下一步不需要浏览器时，推送一个等待屏幕以清除过时内容：
   ```html
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">在终端中继续...</p>
   </div>
   ```

---

## 编写内容片段

只写放在页面内部的内容。服务器会自动用框架模板包裹它（头部、主题 CSS、选择指示器和所有交互基础设施）。

**最简示例**：

```html
<h2>哪种布局更好？</h2>
<p class="subtitle">考虑可读性和视觉层次</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>单栏</h3>
      <p>简洁、专注的阅读体验</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>双栏</h3>
      <p>侧边栏导航加主内容区</p>
    </div>
  </div>
</div>
```

就这些。不需要 `<html>`，不需要 CSS，不需要 `<script>` 标签。

---

## 可用的 CSS 类

### 选项（A/B/C 选择）

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>标题</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

**多选**：在容器上添加 `data-multiselect` 让用户选择多个选项。

```html
<div class="options" data-multiselect>
  <!-- 相同的选项标记——用户可以选择/取消选择多个 -->
</div>
```

### 卡片（视觉设计）

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- 原型内容 --></div>
    <div class="card-body">
      <h3>名称</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

### 原型容器

```html
<div class="mockup">
  <div class="mockup-header">预览：仪表盘布局</div>
  <div class="mockup-body"><!-- 你的原型 HTML --></div>
</div>
```

### 分屏视图（并排）

```html
<div class="split">
  <div class="mockup"><!-- 左侧 --></div>
  <div class="mockup"><!-- 右侧 --></div>
</div>
```

### 优缺点

```html
<div class="pros-cons">
  <div class="pros"><h4>优点</h4><ul><li>好处</li></ul></div>
  <div class="cons"><h4>缺点</h4><ul><li>不足</li></ul></div>
</div>
```

### 模拟元素（线框图构建块）

```html
<div class="mock-nav">Logo | 首页 | 关于 | 联系我们</div>
<div style="display: flex;">
  <div class="mock-sidebar">导航</div>
  <div class="mock-content">主内容区域</div>
</div>
<button class="mock-button">操作按钮</button>
<input class="mock-input" placeholder="输入框">
<div class="placeholder">占位区域</div>
```

### 排版和区块

- `h2` — 页面标题
- `h3` — 章节标题
- `.subtitle` — 标题下方的辅助文字
- `.section` — 带底部边距的内容块
- `.label` — 小号大写标签文字

---

## 浏览器事件格式

当用户在浏览器中点击选项时，交互记录会保存到事件文件（每行一个 JSON 对象）。

```jsonl
{"type":"click","choice":"a","text":"选项 A - 简单布局","timestamp":1706000101}
{"type":"click","choice":"c","text":"选项 C - 复杂网格","timestamp":1706000108}
{"type":"click","choice":"b","text":"选项 B - 混合方案","timestamp":1706000115}
```

完整的事件流展示了用户的探索路径——他们可能在确定之前点击了多个选项。最后一个 `choice` 事件通常是最终选择，但点击模式可以揭示犹豫或值得询问的偏好。

如果事件文件不存在，说明用户没有与浏览器交互——仅使用他们的终端文字。

---

## 设计技巧

- **保真度匹配问题** — 布局问题用线框图，细节打磨问题用精细设计
- **在每个页面上解释问题** — "哪种布局看起来更专业？"而不仅仅是"选一个"
- **推进前先迭代** — 如果反馈修改了当前屏幕，写入新版本
- 每个屏幕最多 **2-4 个选项**
- **必要时使用真实内容** — 对于摄影作品集，使用实际图片。占位内容会掩盖设计问题
- **保持原型简洁** — 专注于布局和结构，而非像素级精确的设计

---

## 文件命名

- 使用语义化名称：`platform.html`、`visual-style.html`、`layout.html`
- 绝不复用文件名——每个屏幕必须是新文件
- 迭代版本：添加版本后缀如 `layout-v2.html`、`layout-v3.html`
