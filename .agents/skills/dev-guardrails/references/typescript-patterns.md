# TypeScript 模式

以下为独立片段；`Shape`、`Session`、`isUUID` 等由目标项目真实类型和验证器提供，不是本包内可直接运行的完整程序。

## 阅读导航

- [品牌类型](#品牌类型)
- [可辨识联合](#可辨识联合)
- [构造式建模](#构造式建模)
- [最简单的全定义类型](#最简单的全定义类型)
- [`unknown` 优于 `any`](#unknown-优于-any)
- [Schema 先于手写守卫](#schema-先于手写守卫)
- [不用 `as` 断言](#不用-as-断言)
- [类型收窄顺序](#类型收窄顺序)
- [类型守卫](#类型守卫)
- [穷尽检查](#穷尽检查)
- [`satisfies` 优于 `as`](#satisfies-优于-as)
- [边界验证](#边界验证)
- [从 Schema 派生类型](#从-schema-派生类型)
- [对象参数](#对象参数)

[TypeScript 方法](typescript-method.md)中每项规则的代码示例。底层原则不限语言，见 [类型纪律](type-discipline.md) 与 [边界纪律](boundary-discipline.md) 原则技能。

## 品牌类型

为基础类型加品牌，避免混淆。在边界验证一次，后续代码信任类型。

```ts
type AgentId = string & { readonly __brand: "AgentId" };

function isAgentId(input: string): input is AgentId {
  return isUUID(input);
}

function parseAgentId(input: string): AgentId {
  if (!isAgentId(input)) throw new Error(`Invalid agent id: ${input}`);
  return input;
}

function focusAgent(id: AgentId): void {
  /* 输入已经可信 */
}
```

示例采用 `readonly __brand: 'X'`；已有项目品牌约定优先，避免为同一种概念再造第二套约定。

## 可辨识联合

使用字面量判别字段表示变体。每个变体共享字段名，但字段值各不相同，使不可能组合无法表达。

```ts
// 不要这样。布尔值加可选字段允许矛盾状态存在。
type DiffState = { loading: boolean; diff?: GitDiff; error?: string };

// 应这样。只有有效状态。
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

选择一个判别字段名（`kind`、`type`、`tag`）并保持一致。

## 构造式建模

用全部合法的组成部分构建类型，而不是靠运行时检查限制松散类型。

非空使用可变长度元组：

```ts
type NonEmpty<T> = [T, ...T[]];

// 不要这样：T[] 加每个调用者都必须重复的长度检查。
function pickWinner(entries: string[]): string {
  if (entries.length === 0) throw new Error("no entries");
  return entries[Math.floor(Math.random() * entries.length)];
}

// 应这样：该类型不可能有空值。
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)];
}
```

启用 `noUncheckedIndexedAccess` 时，非空元组只保证已知第一个位置，变量下标仍可能需要显式收窄；不要为让示例编译而关闭项目检查。上例展示数据形状，移植到目标编译配置后还须检查索引证据。

普通 `T[]` 进入时，用守卫收窄一次，事实随后由类型传递：

```ts
const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0;
```

偶数长度，用成对元素：

```ts
type Pairs<T> = [T, T][];
```

时间区间，用起点加时长：

```ts
// 不要这样：由注释维持不变量。
type TimeRange = { start: Date; end: Date }; // start <= end

// 以起点加时长消除两个端点的同步问题；时长仍需验证为有限、非负。
type TimeRange = { start: Date; durationMs: number };
```

普通 `number` 允许负数、NaN 和 Infinity，这个表示本身不证明时长合法。在数据进入边界验证有限、非负，内部再信任该约束；需要跨模块传播证明时可采用经验证的品牌类型。只有原始数字可能误传到期望时长的位置时，才按品牌类型加品牌，不条件反射地加。选择让错误状态无法构造的表示，再在其上提供所需读取方式，例如 `pairs.flat()` 或 `rangeEnd()` 辅助函数。

## 最简单的全定义类型

不要把所有类型都加强。每个操作对全部输入都有定义时，保留 `T[]`：

```ts
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0); // [] 得到 0，没有问题。
```

松散类型迫使使用处说谎时，再加强。信号包括 `!`、`arr[0] as T`，以及“不应发生”的异常：

```ts
// 不要这样：把未定义情况偷偷绕过编译器。
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// 应这样：加强输入，断言消失。
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

将结果放宽为 `Session | undefined`，是另一种对全部输入有定义的签名。

## `unknown` 优于 `any`

外部数据始终是 `unknown`，使用前收窄。

```ts
// 不要这样。
function handle(input: any) {
  return input.foo.bar;
}

// 应这样。
function handle(input: unknown) {
  if (typeof input === "object" && input !== null && "foo" in input) {
    // 已收窄；编译器核验访问。
  }
}
```

外部来源包括 RPC 负载、`JSON.parse`、`postMessage`、IPC、文件内容、环境变量、数据库结果。

## Schema 先于手写守卫

为外部数据逐属性手写类型守卫前，先寻找仓库运行时 Schema 库与已有 Schema。让单一 Schema 负责验证，再从它派生 TypeScript 类型。不要同时维护会相互漂移的 Schema、重复接口和守卫。

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

失败是预期分支时使用 `safeParse`。仓库使用其他 Schema 库时，使用等价推导辅助功能。不要为一个守卫新增 Schema 依赖，本规则优先采用代码库已经信任的 Schema 系统。

## 不用 `as` 断言

不要让 `as` 代替验证；它只影响类型检查，不验证运行时数据。必要断言应有可以复核的不变量，不能把无法表达的约束当作已经证明。

```ts
import { z } from "zod";

// 不要这样。
const user = data as User;

// 不要这样。
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data;
}

// 应这样。
const userSchema = z.object({ id: z.string(), name: z.string() });
type User = z.infer<typeof userSchema>;

function parseUser(data: unknown): User {
  return userSchema.parse(data);
}
```

类型先存在时，为验证器标注它证明的类型。编译器随后会拒绝证明范围少于类型要求的验证器。删除下方对象中的 `name`，赋值就无法编译。

```ts
type User = { id: string; name: string };

const userSchema: z.ZodType<User> = z.object({ id: z.string(), name: z.string() });
```

从现有代码中重构移除 `as` 时，查明 TypeScript 为什么无法推导：

- 缺少判别字段：增加一个，改用可辨识联合。
- 来源类型过宽，例如 `Record<string, unknown>`：收窄它。
- 无类型边界：使用负责该形状的 Schema 解析。只有不存在时才增加 Schema。
- 确实无法表达：查明语言限制，使用适当表示或局部受约束断言；品牌仍须真实验证，`satisfies` 也不会执行运行时验证。

## 类型收窄顺序

从最佳到最后手段：

1. **可辨识联合 switch / if。** 编译器自动收窄。
2. **`in` 操作符。** `"key" in obj` 收窄到包含该键的变体。
3. **`typeof` / `instanceof`。** 用于基础值与类实例。
4. **用户定义类型守卫。** 上述方式不足时使用。
5. **`as` 断言。** 只在验证后使用。

```ts
function area(s: Shape): number {
  if ("radius" in s) return Math.PI * s.radius ** 2; // 收窄为圆。
  return s.width * s.height; // 收窄为矩形。
}
```

## 类型守卫

守卫必须真实验证自己的主张。说谎的守卫比 `as` 更糟。

```ts
function isCircle(s: Shape): s is Shape & { kind: "circle" } {
  return s.kind === "circle";
}
```

可以时优先使用判别字段收窄。

## 穷尽检查

在 default 分支，把判别对象赋给 `never` 类型局部变量。

```ts
// 返回值的 switch。
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

// 返回 void 的 switch。
function handle(s: Shape): void {
  switch (s.kind) {
    case "circle":
      drawCircle(s);
      break;
    case "rect":
      drawRect(s);
      break;
    default: {
      const _exhaustive: never = s;
      void _exhaustive;
    }
  }
}
```

返回值的 switch 使用 return 写法，语句式 switch 使用 void 写法。

## `satisfies` 优于 `as`

`satisfies` 在不拓宽字面量类型的情况下验证。

```ts
// 不要这样。拓宽类型，丢失字面量类型。
const config = { theme: "dark", cols: 3 } as Config;

// 应这样。既验证，又保留字面量类型。
const config = { theme: "dark", cols: 3 } satisfies Config;
// config.theme 是字面量 "dark"，不是 string。
```

## 边界验证

数据进入处验证一次，内部信任类型。见 [边界纪律](boundary-discipline.md) 原则技能。

- **传输格式**，如 proto、JSON-RPC：遵循协议的未知字段和兼容规则。只有实际解析库支持且协议允许时才用 `ignoreUnknownFields`；它不是所有协议与解析器共有的选项。
- **持久化 JSON：** 使用带版本的对象，解析外包一层 try/catch。
- **不在调用链深处重复验证。**

## 从 Schema 派生类型

`.proto`、OpenAPI 规格、GraphQL Schema 或数据库迁移已经定义形状时，从生成类型派生，不重复定义。

```ts
// 不要这样。重复形状，会随 Schema 变化而漂移。
type CheckSummary = {
  totalCount: number;
  checks: { name: string; status: string }[];
};
function renderChecks(s: CheckSummary) {
  /* ... */
}

// 应这样。从生成的 Schema 类型派生。
import type { ChecksMessage } from "<generated module>";
function renderChecks(s: Pick<ChecksMessage, "totalCount" | "checks">) {
  /* ... */
}
```

编写新接口前，先考虑 `Pick`、`Omit`、`Parameters`、`ReturnType`、`Awaited`、`typeof`。

## 对象参数

```ts
// 不要这样。交换两个参数仍可编译。
openFile(uri, {
  startLineNumber: 10,
  startColumn: 1,
  endLineNumber: 10,
  endColumn: 1,
});

// 应这样。不依赖顺序，自我说明。
openFile({
  uri,
  selection: {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 1,
  },
});
```

热路径上跳过，例如逐帧渲染、分词器、解析器，或任何分配成本重要的紧循环。
