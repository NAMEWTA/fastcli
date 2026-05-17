# Artifact Graph Specification（产物依赖图规范）

> 本规范定义了 SpecForge 变更工作流中的产物依赖关系、DAG 拓扑排序、阻塞检测和完成状态追踪机制。

---

## 一、核心概念

### 1.1 什么是产物（Artifact）

产物（Artifact）是变更工作流中生成的文档或文件，每个产物代表工作流中的一个阶段输出。

### 1.2 什么是产物依赖图（Artifact Graph）

产物依赖图是一个有向无环图（DAG），定义了：
- 变更需要生成哪些产物
- 产物之间的依赖关系
- 产物的生成顺序

### 1.3 为什么需要产物依赖图

- **明确工作流**：清晰定义每个阶段需要产出什么
- **依赖管理**：自动计算哪些产物可以先创建，哪些被阻塞
- **进度追踪**：实时了解变更完成度
- **并行优化**：识别可并行生成的产物

---

## 二、Artifact 定义

### 2.1 Artifact 结构

每个产物（Artifact）包含以下字段：

| 字段 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | string | ✅ | 唯一标识符（kebab-case） | `proposal`, `specs`, `design` |
| `generates` | string | ✅ | 生成的文件路径模式 | `proposal.md`, `specs/**/*.md` |
| `description` | string | ✅ | 产物描述 | "Initial proposal document" |
| `template` | string | ✅ | 使用的模板文件 | `proposal.md` |
| `instruction` | string | ✅ | 生成产物的详细指令 | "Create the proposal document..." |
| `requires` | string[] | ✅ | 前置产物 ID 数组 | `["proposal"]` |

### 2.2 Artifact 示例

```yaml
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal document outlining the change
    template: proposal.md
    instruction: |
      Create the proposal document that establishes the requirements baseline for this change.
      
      Sections:
      - **Context**: 1-2 paragraphs on current pain points and trigger
      - **Goals**: measurable outcomes this change must achieve
      - **Non-Goals**: explicit out-of-scope items with rationale
      - **Acceptance Criteria**: verifiable SHALL statements
      - **Impact**: affected code, APIs, dependencies
      
      Keep it concise (1-2 pages). Focus on "what to achieve and what not to do", not implementation detail.
    requires: []

  - id: specs
    generates: "specs/**/*.md"
    description: Detailed specifications for the change
    template: spec.md
    instruction: |
      Create specification files that define WHAT the system should do.
      
      Format requirements:
      - Each requirement: ### Requirement: <name>
      - Use SHALL/MUST for normative requirements
      - Each scenario MUST have at least one WHEN/THEN scenario
    requires:
      - proposal

  - id: design
    generates: design.md
    description: Technical design document with implementation details
    template: design.md
    instruction: |
      Create the design document that explains HOW to implement the change.
      
      Sections:
      - **Context**: Background, current state, constraints
      - **Goals / Non-Goals**: What this design achieves and excludes
      - **Decisions**: Key technical choices with rationale
      - **Risks / Trade-offs**: Known limitations
    requires:
      - proposal

  - id: tasks
    generates: tasks.md
    description: Implementation checklist with trackable tasks
    template: tasks.md
    instruction: |
      Create the task list that breaks down the implementation work.
      
      Guidelines:
      - Group related tasks under ## numbered headings
      - Each task MUST be a checkbox: - [ ] X.Y Task description
      - Tasks should be small enough to complete in one session
      - Order tasks by dependency
    requires:
      - specs
      - design
```

---

## 三、SpecForge 产物依赖图

### 3.1 标准工作流

```yaml
name: specforge-standard
version: 1
description: SpecForge 标准变更工作流

artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
    
  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
    
  - id: design
    generates: design.md
    requires: [proposal]
    
  - id: tasks
    generates: tasks.md
    requires: [specs, design]
```

### 3.2 可视化依赖图

```
proposal (根产物)
  ├──→ specs
  │      └──→ tasks (叶产物)
  └──→ design
         └──→ tasks (叶产物)
```

### 3.3 构建顺序

使用 Kahn 算法计算拓扑排序：

```
Step 1: proposal (in-degree: 0)
Step 2: design (in-degree: 0，不再依赖 proposal)
Step 3: specs (in-degree: 0，不再依赖 proposal)
Step 4: tasks (in-degree: 0，不再依赖 specs 和 design)

最终构建顺序: [proposal, design, specs, tasks]
```

---

## 四、DAG 拓扑排序（Kahn 算法）

### 4.1 算法原理

Kahn 算法是一种经典的拓扑排序算法，适用于 DAG（有向无环图）。

### 4.2 算法步骤

```
输入: ArtifactGraph（产物依赖图）
输出: buildOrder（构建顺序数组）

1. 初始化所有产物的入度（in-degree）
   - in-degree[artifact] = artifact.requires.length

2. 构建反向邻接表（谁依赖谁）
   - dependents[req].push(artifact.id)

3. 找出所有入度为 0 的产物（根产物）
   - queue = [所有 in-degree 为 0 的产物]
   - 排序以确保确定性

4. 处理队列
   while queue 不为空:
     current = queue.shift()
     result.push(current)
     
     newlyReady = []
     for dep in dependents[current]:
       in-degree[dep] -= 1
       if in-degree[dep] == 0:
         newlyReady.push(dep)
     
     queue.push(...newlyReady.sort())

5. 返回 result
```

### 4.3 TypeScript 实现

```typescript
class ArtifactGraph {
  private artifacts: Map<string, Artifact>;

  getBuildOrder(): string[] {
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    // 初始化所有产物
    for (const artifact of this.artifacts.values()) {
      inDegree.set(artifact.id, artifact.requires.length);
      dependents.set(artifact.id, []);
    }

    // 构建反向邻接表
    for (const artifact of this.artifacts.values()) {
      for (const req of artifact.requires) {
        dependents.get(req)!.push(artifact.id);
      }
    }

    // 找出根产物（入度为 0）
    const queue = [...this.artifacts.keys()]
      .filter(id => inDegree.get(id) === 0)
      .sort();

    const result: string[] = [];

    // 处理队列
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // 收集新就绪的产物
      const newlyReady: string[] = [];
      for (const dep of dependents.get(current)!) {
        const newDegree = inDegree.get(dep)! - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          newlyReady.push(dep);
        }
      }
      queue.push(...newlyReady.sort());
    }

    return result;
  }
}
```

### 4.4 示例执行

```
输入产物图:
proposal: requires []
specs: requires [proposal]
design: requires [proposal]
tasks: requires [specs, design]

执行过程:
初始入度: { proposal: 0, specs: 1, design: 1, tasks: 2 }
反向邻接: { proposal: [specs, design], specs: [tasks], design: [tasks], tasks: [] }

Step 1: queue = [proposal], result = []
Step 2: 处理 proposal, result = [proposal]
        specs 入度变为 0, design 入度变为 0
        queue = [design, specs]
Step 3: 处理 design, result = [proposal, design]
        tasks 入度变为 1
        queue = [specs]
Step 4: 处理 specs, result = [proposal, design, specs]
        tasks 入度变为 0
        queue = [tasks]
Step 5: 处理 tasks, result = [proposal, design, specs, tasks]
        queue = []

输出: [proposal, design, specs, tasks]
```

---

## 五、阻塞检测机制

### 5.1 完成状态集合

使用 `CompletedSet` 追踪已完成的产物：

```typescript
type CompletedSet = Set<string>;

const completed = new Set<string>();
completed.add('proposal');
completed.add('design');
```

### 5.2 查询可创建的产物

```typescript
getNextArtifacts(completed: CompletedSet): string[] {
  const ready: string[] = [];

  for (const artifact of this.artifacts.values()) {
    if (completed.has(artifact.id)) {
      continue; // 已完成
    }

    const allDepsCompleted = artifact.requires.every(req => 
      completed.has(req)
    );
    
    if (allDepsCompleted) {
      ready.push(artifact.id);
    }
  }

  return ready.sort();
}
```

#### 示例

```
产物图:
proposal: requires []
specs: requires [proposal]
design: requires [proposal]
tasks: requires [specs, design]

已完成: { proposal }

getNextArtifacts({ proposal }):
- specs: requires [proposal] ✓ 所有依赖已完成 → 就绪
- design: requires [proposal] ✓ 所有依赖已完成 → 就绪
- tasks: requires [specs, design] ✗ specs 和 design 未完成 → 阻塞

返回: [design, specs]
```

### 5.3 查询被阻塞的产物

```typescript
getBlocked(completed: CompletedSet): BlockedArtifacts {
  const blocked: BlockedArtifacts = {};

  for (const artifact of this.artifacts.values()) {
    if (completed.has(artifact.id)) {
      continue; // 已完成
    }

    const unmetDeps = artifact.requires.filter(req => 
      !completed.has(req)
    );
    
    if (unmetDeps.length > 0) {
      blocked[artifact.id] = unmetDeps.sort();
    }
  }

  return blocked;
}
```

#### 示例

```
已完成: { proposal }

getBlocked({ proposal }):
- tasks: requires [specs, design]
  未满足依赖: [design, specs]
  
返回: { tasks: [design, specs] }
```

### 5.4 检查是否全部完成

```typescript
isComplete(completed: CompletedSet): boolean {
  for (const artifact of this.artifacts.values()) {
    if (!completed.has(artifact.id)) {
      return false;
    }
  }
  return true;
}
```

---

## 六、循环依赖检测

### 6.1 为什么需要检测

循环依赖会导致无法计算构建顺序，系统会陷入死锁。

### 6.2 DFS 检测算法

```typescript
function validateNoCycles(artifacts: Artifact[]): void {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(id: string): string | null {
    visited.add(id);
    inStack.add(id);

    const artifact = artifactMap.get(id);
    if (!artifact) return null;

    for (const dep of artifact.requires) {
      if (!visited.has(dep)) {
        parent.set(dep, id);
        const cycle = dfs(dep);
        if (cycle) return cycle;
      } else if (inStack.has(dep)) {
        // 发现循环 - 重构路径
        const cyclePath = [dep];
        let current = id;
        while (current !== dep) {
          cyclePath.unshift(current);
          current = parent.get(current)!;
        }
        cyclePath.unshift(dep);
        return cyclePath.join(' → ');
      }
    }

    inStack.delete(id);
    return null;
  }

  for (const artifact of artifacts) {
    if (!visited.has(artifact.id)) {
      const cycle = dfs(artifact.id);
      if (cycle) {
        throw new Error(`Cyclic dependency detected: ${cycle}`);
      }
    }
  }
}
```

### 6.3 示例

```
❌ 循环依赖:
A: requires [B]
B: requires [C]
C: requires [A]

检测结果: "Cyclic dependency detected: A → B → C → A"

✅ 无循环依赖:
A: requires []
B: requires [A]
C: requires [A, B]

检测结果: 通过
```

---

## 七、引用有效性验证

### 7.1 验证规则

所有 `requires` 字段中的产物 ID 必须存在于产物图中。

### 7.2 验证算法

```typescript
function validateRequiresReferences(artifacts: Artifact[]): void {
  const validIds = new Set(artifacts.map(a => a.id));

  for (const artifact of artifacts) {
    for (const req of artifact.requires) {
      if (!validIds.has(req)) {
        throw new Error(
          `Invalid dependency reference in artifact '${artifact.id}': ` +
          `'${req}' does not exist`
        );
      }
    }
  }
}
```

### 7.3 示例

```
❌ 无效引用:
proposal: requires []
specs: requires [proposal, design]  // design 不存在

检测结果: "Invalid dependency reference in artifact 'specs': 'design' does not exist"

✅ 有效引用:
proposal: requires []
design: requires [proposal]
specs: requires [proposal, design]

检测结果: 通过
```

---

## 八、SpecForge 集成

### 8.1 在 planning-breakdown 中使用

```markdown
## Step 1.2: 加载产物依赖图

参考 `references/artifact-graph-spec.md`，验证：

1. 读取 `.specforge/changes/<ChangeName>/artifact-graph.yaml`
2. 验证产物图有效性：
   - [ ] 所有产物 ID 唯一
   - [ ] 所有 requires 引用有效
   - [ ] 无循环依赖
3. 计算构建顺序
4. 检查当前完成状态
```

### 8.2 产物图文件示例

**文件**: `specforge/changes/add-user-auth/artifact-graph.yaml`

```yaml
name: add-user-auth
version: 1
created: "2026-05-07"

artifacts:
  - id: proposal
    generates: proposal.md
    description: 用户认证功能提案
    requires: []
    status: completed
    completedAt: "2026-05-07T10:00:00Z"

  - id: specs
    generates: specs/user-auth/spec.md
    description: 用户认证规格
    requires: [proposal]
    status: in-progress

  - id: design
    generates: design.md
    description: 技术设计方案
    requires: [proposal]
    status: pending

  - id: tasks
    generates: tasks.md
    description: 实施任务列表
    requires: [specs, design]
    status: pending
```

### 8.3 进度追踪

```bash
# 查询可创建的产物
specforge status --change=add-user-auth --next-artifacts

# 查询被阻塞的产物
specforge status --change=add-user-auth --blocked

# 查询完成度
specforge status --change=add-user-auth --progress
# 输出: 25% (1/4 artifacts completed)
```

---

## 九、最佳实践

### 9.1 设计产物图

1. **从简单开始**：先定义核心产物，再逐步扩展
2. **明确依赖**：每个产物的 requires 应该尽可能少
3. **避免深层嵌套**：依赖链不超过 4 层
4. **命名一致**：使用 kebab-case（proposal, user-auth-specs）

### 9.2 验证产物图

在每次修改产物图后，运行验证：

```bash
specforge doctor --check-artifact-graph
```

### 9.3 并行优化

识别可并行的产物（同层级、无相互依赖）：

```
proposal → specs ──→ tasks
       ↘ design ──→
       
specs 和 design 可并行创建
```

---

## 使用指南

在 planning-breakdown 命令执行过程中：

- **Step 1.2（加载产物依赖图）** → 参考"Artifact 定义"和"SpecForge 产物依赖图"
- **Step 5.2（产物依赖图）** → 参考"SpecForge 产物依赖图"和"可视化依赖图"
- **Step 5.3（DAG 验证）** → 参考"循环依赖检测"和"引用有效性验证"
- **进度追踪** → 参考"阻塞检测机制"和"SpecForge 集成"
