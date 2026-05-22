/**
 * Slug 生成与去重工具，主要服务 `fastcli add` 流程：当用户填了「工具名称」
 * 但没显式给出「工具 ID」时，需要从 `name` 派生一个合法 id；如果派生结果
 * 与 builtin / user 已有 id 冲突，则在末尾追加 `-2`、`-3`… 直到不冲突。
 *
 * 设计要点（详见 design.md §Correctness Properties / Property 9）：
 *
 * - **toSlug 的目标字符集**：Requirement 2.4 把工具 id 限制为
 *   `^[a-z0-9][a-z0-9-]*$`（长度 1–64）。`toSlug` 必须保证产物落在
 *   `[a-z0-9-]+` 内，且首字符为 `[a-z0-9]`（由「修剪首尾连字符」一步
 *   保证）。中文、空格、下划线、大写字母（小写化处理后）都先被替换为
 *   连字符，再由「合并连续连字符」+「修剪首尾」收敛成合法 slug。
 * - **空结果回退到 `'tool'`**：极端输入（如纯中文、纯标点、空串）经过
 *   清洗后可能整串都被剥光，此时返回兜底字面量 `'tool'`，让上层流程
 *   不必再判空。Property 9 的「产物只含 `[a-z0-9-]+`」对空串是不成立
 *   的，所以兜底是必须的。
 * - **uniqueSlug 的查找复杂度**：把传入的 `existing` 一次性物化成
 *   `Set<string>`，使后续的「base 是否冲突」与每次 `${base}-${i}` 查
 *   询都是 O(1)。允许传 `Set` / `Array` / 任意 `Iterable<string>`，让
 *   调用方不必再做转换；命中 `Set` 时直接复用，避免不必要的拷贝。
 * - **稳定性**：`toSlug(s)` 与 `uniqueSlug(base, existing)` 都是纯函数，
 *   同样的输入永远得到同样的输出（Property 9 第三条）。
 *
 * Validates: Requirements 2.4
 */

/** `toSlug` 处理空白结果时回退到的兜底 id。 */
const FALLBACK_SLUG = 'tool';

/**
 * 把任意字符串归一化为合法的工具 slug。
 *
 * 算法步骤：
 *
 * 1. 先 `toLowerCase()`：把大写字母收敛到 `[a-z]`，避免在第 2 步被替换。
 * 2. 用一次正则把所有不在 `[a-z0-9-]` 的字符替换成 `-`：空格、下划线、
 *    标点、中文等都会变成连字符；这一步是「字符集裁剪」。
 * 3. 把连续的 `-` 折叠成单个 `-`：第 2 步往往会产生大量相邻连字符，
 *    例如 `Claude  Code` → `claude--code`，需要再收敛成 `claude-code`。
 * 4. 修剪首尾的 `-`：保证首字符落在 `[a-z0-9]`，满足 Requirement 2.4
 *    的 `^[a-z0-9][a-z0-9-]*$`。
 * 5. 若结果为空（输入整串都是非法字符），回退到 `'tool'`。
 *
 * @param name 任意用户输入字符串
 * @returns    合法的工具 slug；至少包含一个 `[a-z0-9]` 字符
 *
 * @example
 *   toSlug('Claude Code');        // 'claude-code'
 *   toSlug('Claude_Code v2');     // 'claude-code-v2'
 *   toSlug('  ---hello---  ');    // 'hello'
 *   toSlug('中文工具');           // 'tool'
 *   toSlug('');                   // 'tool'
 */
export function toSlug(name: string): string {
  const lowered = name.toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9-]/g, '-');
  const collapsed = replaced.replace(/-+/g, '-');
  const trimmed = collapsed.replace(/^-+|-+$/g, '');

  if (trimmed.length === 0) {
    return FALLBACK_SLUG;
  }

  return trimmed;
}

/**
 * 把 `existing` 物化成 `Set<string>` 以便 O(1) 查找。
 *
 * - 已经是 `Set` 时直接复用，避免不必要的拷贝；
 * - 否则借助 `Set` 构造器接受任意 `Iterable<string>` 的特性一次性收集。
 */
function asSet(existing: Iterable<string> | string[] | Set<string>): Set<string> {
  if (existing instanceof Set) {
    return existing;
  }
  return new Set(existing);
}

/**
 * 在已有 slug 集合中为 `base` 找到一个不冲突的 slug。
 *
 * 行为：
 *
 * - 若 `base ∉ existing`，直接返回 `base`。
 * - 否则依次尝试 `${base}-2`、`${base}-3`、…，返回第一个不在 `existing`
 *   中的候选。
 *
 * 注意：
 *
 * - 入参 `existing` 可以是 `Set` / `Array` / 任意 `Iterable<string>`；
 *   函数内部统一物化成 `Set<string>` 做 O(1) 查找。
 * - 后缀从 `2` 起步（不是 `1`），与 PRD §6.3「id 冲突时追加 `-2`、`-3`…」
 *   一致。
 * - 本函数纯函数：同样的 `(base, existing)` 永远得到同样的结果（Property 9）。
 *
 * @param base     候选 slug（通常是 `toSlug(name)` 的产物，已合法）
 * @param existing 已被占用的 slug 集合
 * @returns        一个保证不在 `existing` 中的 slug
 *
 * @example
 *   uniqueSlug('claude', new Set());                          // 'claude'
 *   uniqueSlug('claude', new Set(['claude']));                // 'claude-2'
 *   uniqueSlug('claude', new Set(['claude', 'claude-2']));    // 'claude-3'
 */
export function uniqueSlug(
  base: string,
  existing: Iterable<string> | string[] | Set<string>,
): string {
  const taken = asSet(existing);

  if (!taken.has(base)) {
    return base;
  }

  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
}
