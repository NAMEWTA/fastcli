# FastCLI Web Admin v2 重构设计规格

## 1. 背景与目标

### 1.1 v1 现状问题

当前 `fastcli web` 管理后台（v1）存在以下问题：

| 问题 | 描述 |
|------|------|
| 左侧导航无功能 | "按任务/按类型"按钮没有绑定事件，点击无响应 |
| 只能编辑 | 不支持新增或删除配置条目 |
| JSON 模式暴露 | 用户需要理解 JSON 格式才能编辑 |
| 三栏布局拥挤 | 右侧抽屉空间不足，编辑体验差 |
| 视觉设计粗糙 | 层次不清晰，缺乏专业感 |

### 1.2 v2 目标

将管理后台升级为专业级别，具备：

- ✅ 完整 CRUD 操作（Create/Read/Update/Delete）
- ✅ 纯表单交互，用户无需接触 JSON
- ✅ 现代化管理后台设计风格
- ✅ 可视化工作流步骤编辑器

## 2. 范围定义

### 2.1 In Scope（v2）

**功能增强**
- 所有模块支持新增条目
- 所有模块支持删除条目（带确认弹窗）
- 工作流支持可视化步骤编辑器
- 保留导入/导出功能

**UI 重构**
- 深色侧边栏 + 浅色主区域布局
- 模态弹窗（Modal）替代右侧抽屉
- 纯表单模式（移除 JSON 编辑切换）
- 数据表格展示列表

**交互优化**
- 左侧导航直接切换模块
- 密码字段遮蔽显示（可切换）
- 删除操作二次确认
- 表单验证即时反馈

### 2.2 Out of Scope（v2 不做）

- 拖拽式工作流流程图设计器
- 实时协作编辑
- 远程配置源
- 多用户权限管理
- 暗色主题切换

## 3. 设计决策

| 决策项 | 选择 | 备选方案 | 决策理由 |
|--------|------|----------|----------|
| 整体风格 | 深色侧边栏 + 浅色主区域 | 全浅色、全深色 | 专业感强，符合主流管理后台风格 |
| 编辑方式 | 模态弹窗（Modal） | 右侧抽屉、内联展开 | 聚焦当前操作，解决空间拥挤问题 |
| 数据格式 | 纯表单模式 | 表单+JSON预览、表单/JSON切换 | 降低使用门槛，用户无需了解 JSON |
| 工作流编辑 | 可视化步骤编辑器 | 结构化表单、简化版 | 拖拽排序、卡片式选项，直观易用 |

## 4. 技术架构

### 4.1 保留现有技术栈

- React 19.x
- TypeScript
- esbuild 构建
- 纯 CSS（无 UI 框架依赖）

### 4.2 组件结构重构

```
src/web-admin/
├── App.tsx                    # 根组件（保留登录逻辑）
├── main.tsx                   # 入口
├── styles.css                 # 全局样式（重写）
├── lib/
│   ├── api.ts                 # API 调用（扩展 CRUD）
│   └── state.ts               # 状态管理（扩展）
└── components/
    ├── Layout/
    │   ├── Sidebar.tsx        # 新: 深色侧边栏导航
    │   └── MainContent.tsx    # 新: 主内容区容器
    ├── LoginPage.tsx          # 保留
    ├── ModulePages/
    │   ├── AliasesPage.tsx    # 新: Aliases 列表页
    │   ├── ProvidersPage.tsx  # 新: Providers 列表页
    │   ├── CredentialsPage.tsx# 新: Credentials 列表页
    │   └── WorkflowsPage.tsx  # 新: Workflows 列表页
    ├── Tables/
    │   └── DataTable.tsx      # 新: 通用数据表格组件
    ├── Modals/
    │   ├── Modal.tsx          # 新: 通用弹窗容器
    │   ├── AliasForm.tsx      # 新: Alias 表单
    │   ├── ProviderForm.tsx   # 新: Provider 表单
    │   ├── CredentialForm.tsx # 新: Credential 表单
    │   ├── WorkflowForm.tsx   # 新: Workflow 可视化编辑器
    │   └── ConfirmDelete.tsx  # 新: 删除确认弹窗
    └── FormControls/
        ├── Input.tsx          # 新: 输入框组件
        ├── KeyValueEditor.tsx # 新: 键值对编辑器
        └── StepEditor.tsx     # 新: 工作流步骤编辑器
```

### 4.3 待删除组件（v1 遗留）

- `AdminShell.tsx`
- `EditDrawer.tsx`
- `ModuleList.tsx`
- `OverviewCards.tsx`

## 5. 信息架构与页面结构

### 5.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│                      FastCLI Admin                      │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │            Main Content                  │
│   (240px)    │                                          │
│              │  ┌────────────────────────────────────┐  │
│  配置管理     │  │  Page Header (Title + Actions)    │  │
│  ├ Aliases   │  ├────────────────────────────────────┤  │
│  ├ Providers │  │                                    │  │
│  ├ Credentials│  │         Data Table                 │  │
│  └ Workflows │  │                                    │  │
│              │  │                                    │  │
│  操作        │  │                                    │  │
│  ├ 导入配置   │  │                                    │  │
│  └ 导出配置   │  └────────────────────────────────────┘  │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 5.2 颜色系统

| 变量 | 色值 | 用途 |
|------|------|------|
| `--sidebar-bg` | #1f2937 | 侧边栏背景 |
| `--sidebar-text` | #9ca3af | 侧边栏文字 |
| `--sidebar-active` | #3b82f6 | 侧边栏选中项 |
| `--main-bg` | #f5f7fa | 主区域背景 |
| `--card-bg` | #ffffff | 卡片/表格背景 |
| `--text-primary` | #1f2937 | 主要文字 |
| `--text-secondary` | #6b7280 | 次要文字 |
| `--border` | #e5e7eb | 边框颜色 |
| `--primary` | #3b82f6 | 主色调（按钮等） |
| `--danger` | #dc2626 | 危险操作 |

### 5.3 侧边栏规格

**布局**
- 宽度: 240px
- 背景: #1f2937
- 高度: 100vh（固定）

**元素**
- Logo + 标题区
- 配置管理分组
  - Aliases（带数量角标）
  - Providers（带数量角标）
  - Credentials（带数量角标）
  - Workflows（带数量角标）
- 操作分组
  - 导入配置
  - 导出配置

**交互**
- 当前选中项: #3b82f6 背景
- 悬停: rgba(255,255,255,0.1) 背景

### 5.4 数据表格规格

**通用结构**
- 表头: #f9fafb 背景
- 行: 白色背景
- 悬停: #f9fafb 背景
- 分隔线: #f3f4f6

**列配置**

| 模块 | 列 |
|------|-----|
| Aliases | 名称、命令、描述、操作 |
| Providers | ID、命令、模式数量、操作 |
| Credentials | ID、标签、字段数量、操作 |
| Workflows | 名称、描述、步骤数量、操作 |

**操作列**
- 编辑按钮: 默认样式
- 删除按钮: 红色警告样式

### 5.5 模态弹窗规格

**容器**
- 最大宽度: 600px（基础表单）/ 900px（Workflow 编辑器）
- 圆角: 16px
- 阴影: 0 25px 50px -12px rgba(0,0,0,0.25)
- 遮罩: rgba(0,0,0,0.5)

**结构**
- Header: 图标 + 标题 + 关闭按钮
- Body: 表单内容（最大高度 70vh，可滚动）
- Footer: 取消按钮 + 确认按钮

## 6. 表单设计

### 6.1 Alias 表单

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 别名名称 | text | ✅ | 英文字母、数字、连字符 |
| 实际命令 | text (code) | ✅ | 等宽字体显示 |
| 描述 | text | ❌ | 用途说明 |

### 6.2 Provider 表单

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Provider ID | text | ✅ | 唯一标识符 |
| 启动命令 | text (code) | ✅ | CLI 命令 |
| 模式参数 | KeyValueEditor | ❌ | 模式名 → 参数数组 |
| 环境变量映射 | KeyValueEditor | ❌ | 环境变量 → 凭据字段 |

### 6.3 Credential 表单

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 凭据 ID | text | ✅ | 唯一标识符 |
| 显示标签 | text | ❌ | 友好名称 |
| 凭据值 | KeyValueEditor (secret) | ✅ | 键值对，值默认遮蔽 |

### 6.4 Workflow 表单

**基本信息区**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 工作流名称 | text | ✅ | 唯一标识符 |
| 描述 | text | ❌ | 用途说明 |
| 关联 Provider | select | ❌ | 下拉选择已有 Provider |

**步骤编辑器**
- 卡片式步骤列表
- 每个步骤卡片：
  - 拖拽手柄 ⋮⋮
  - 步骤序号
  - 步骤 ID + 提示文字
  - 折叠/展开按钮
  - 删除按钮
- 展开后内容：
  - 步骤 ID 输入框
  - 提示文字输入框
  - 选项列表（卡片式）
    - 选项名称
    - 选项值（可选）
    - 下一步 / 执行命令
  - "+ 添加选项" 按钮
- "+ 添加步骤" 按钮

## 7. 状态管理扩展

### 7.1 现有接口

```typescript
interface AdminStateStore {
  getState(): AdminState;
  updateField(module: ModuleKey, key: string, value: ModuleValue): void;
  updateJsonEntry(module: ModuleKey, key: string, raw: string): Promise<void>;
  saveAll(): Promise<void>;
  importAll(raw: string): Promise<void>;
  exportAll(): string;
}
```

### 7.2 新增接口

```typescript
interface AdminStateStore {
  // 新增方法
  addEntry(module: ModuleKey, key: string, value: ModuleValue): void;
  deleteEntry(module: ModuleKey, key: string): void;
  renameEntry(module: ModuleKey, oldKey: string, newKey: string): void;
}
```

## 8. 关键交互流程

### 8.1 新增条目流程

1. 用户点击"+ 新增 XXX"按钮
2. 弹出模态表单（空白）
3. 用户填写表单
4. 点击"创建"
5. 前端校验
6. 校验通过 → 添加到 workingCopy，标记 dirty
7. 关闭弹窗，更新列表
8. 用户点击"保存"落盘

### 8.2 编辑条目流程

1. 用户点击"编辑"按钮
2. 弹出模态表单（预填当前值）
3. 用户修改表单
4. 点击"保存"
5. 前端校验
6. 校验通过 → 更新 workingCopy，标记 dirty
7. 关闭弹窗，更新列表
8. 用户点击"保存"落盘

### 8.3 删除条目流程

1. 用户点击"删除"按钮
2. 弹出确认弹窗（显示即将删除的内容）
3. 用户点击"确认删除"
4. 从 workingCopy 移除，标记 dirty
5. 更新列表
6. 用户点击"保存"落盘

### 8.4 侧边栏导航流程

1. 用户点击侧边栏模块项
2. 主区域切换到对应模块列表页
3. 高亮当前选中项

## 9. 实现计划

### Phase 1: 基础架构重构

| 任务 | 描述 |
|------|------|
| 重写 styles.css | 新设计系统，颜色变量、组件类 |
| Sidebar 组件 | 深色侧边栏，模块切换，数量角标 |
| MainContent 组件 | 主内容区容器 |
| Modal 组件 | 通用弹窗容器 |
| DataTable 组件 | 通用数据表格 |

### Phase 2: Aliases 模块完整实现

| 任务 | 描述 |
|------|------|
| AliasesPage | 列表页 |
| AliasForm | 新增/编辑表单 |
| ConfirmDelete | 删除确认弹窗 |
| 状态管理 CRUD | addEntry/deleteEntry 方法 |

### Phase 3: Providers & Credentials 模块

| 任务 | 描述 |
|------|------|
| ProvidersPage + ProviderForm | 带 KeyValueEditor |
| CredentialsPage + CredentialForm | 密码遮蔽显示 |
| KeyValueEditor 组件 | 动态键值对编辑 |

### Phase 4: Workflows 可视化编辑器

| 任务 | 描述 |
|------|------|
| WorkflowsPage | 列表页 |
| WorkflowForm | 可视化编辑器外壳 |
| StepEditor | 步骤编辑组件 |
| 拖拽排序 | 步骤顺序调整 |

### Phase 5: 收尾

| 任务 | 描述 |
|------|------|
| 导入/导出迁移 | 整合到新界面 |
| 响应式适配 | 1024px+ 屏幕 |
| 清理旧组件 | 删除 v1 遗留组件 |
| 测试验证 | 确保现有测试通过 |

## 10. 验收标准

### 10.1 功能完整性

- [ ] Aliases 支持增删改查
- [ ] Providers 支持增删改查
- [ ] Credentials 支持增删改查
- [ ] Workflows 支持增删改查
- [ ] 工作流步骤可视化编辑
- [ ] 导入/导出功能正常
- [ ] 保存/校验流程正常

### 10.2 用户体验

- [ ] 用户无需看到或编辑 JSON
- [ ] 表单有完善的验证提示
- [ ] 删除有确认弹窗
- [ ] 密码字段默认遮蔽
- [ ] 操作有明确反馈

### 10.3 视觉效果

- [ ] 符合设计稿风格（深色侧边栏 + 浅色主区域）
- [ ] 响应式布局（1024px+）
- [ ] 交互反馈清晰（悬停、选中状态）

### 10.4 代码质量

- [ ] TypeScript 类型完整
- [ ] 组件职责单一
- [ ] 现有测试通过

## 11. 向后兼容性

- 保留现有 API 接口不变
- 保留登录鉴权流程不变
- 配置文件格式不变

## 12. 未来版本方向

- v2.1: 工作流流程图预览
- v2.2: 配置版本历史
- v2.3: 暗色主题支持

---

*文档版本: 2.0*
*创建日期: 2026-03-26*
*基于: fastcli-web-admin-design.md (v1)*
