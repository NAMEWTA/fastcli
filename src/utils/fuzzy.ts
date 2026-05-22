/**
 * 基于 fuse.js 的轻量模糊匹配工具，用于在用户输入找不到精确匹配时给出
 * 「你是不是想要 X？」式的提示。
 *
 * 这个模块只服务两个调用点：
 *
 * - {@link suggestToolId}：在 `fastcli run <tool-id> ...` 找不到 `<tool-id>`
 *   时，从全部 `[builtin ids ∪ user ids]` 中挑出一个最接近的候选
 *   （Requirement 6.3）
 * - {@link suggestOp}：在 `fastcli run <tool-id> <op>` 找不到 `<op>` 时，
 *   从该工具已配置的操作名中挑出最接近的候选（同样走 Requirement 6.3 的
 *   阈值约束）
 *
 * 设计要点（详见 design.md §Correctness Properties / Property 10）：
 *
 * - **阈值统一为 0.4**：fuse 的 score 范围是 `[0, 1]`，0 表示完全匹配，
 *   越大越远。设计文档把阈值固定在 `0.4`，这样既能容忍 1–2 个字符的
 *   拼写错误，又不会把毫不相关的字符串误推荐成「你是不是要的 X」。
 * - **完全相等的输入不建议**：用户原样输入了候选集中的某一项却走到这里，
 *   通常是上层的找不到判定路径已经处理过了；继续推荐自己不仅没有信息量，
 *   还会让错误信息变成 `找不到 "claude" / 你是不是要 "claude"？` 这种自相
 *   矛盾的输出。Property 10 也明确要求这一点。
 * - **fuse 自带阈值过滤**：把 `threshold: 0.4` 传给 `Fuse` 之后，`search`
 *   返回的结果已经被裁剪过；正常路径下取 `results[0].item` 即可。但
 *   `score` 在 `IFuseOptions` 里是可选字段，类型上仍可能是 `undefined`，
 *   所以执行前再做一次防御性兜底（`score === undefined || score > 0.4`
 *   时返回 `undefined`），避免极端情况下推送一个不靠谱的建议。
 * - **字符串数组直接构造**：`new Fuse<string>(strings, { ... })` 会把每个
 *   字符串本身作为可搜索文本，无需指定 `keys`。这是 fuse.js 7.x 的官方
 *   支持用法，比构造对象数组再指定 key 更直观。
 *
 * Validates: Requirements 6.3
 */

import Fuse from 'fuse.js';

/** fuse score 阈值；超过此值的匹配视为「不够像」，不做建议。 */
const FUZZY_THRESHOLD = 0.4;

/**
 * 在候选字符串集合中为 `input` 查找一个最接近的项。
 *
 * 这是 {@link suggestToolId} 与 {@link suggestOp} 的内部共用实现：两个公共
 * API 在语义上完全一致（输入 + 候选 → 最佳匹配或 `undefined`），分开命名
 * 只是让调用点的可读性更好（`suggestToolId(input, ids)` 比
 * `suggest(input, ids)` 更明确该输入是工具 id 还是操作名）。
 *
 * 短路顺序：
 *
 * 1. `input` 为空字符串 / `candidates` 为空数组 → `undefined`，没必要构造
 *    Fuse 实例
 * 2. `candidates` 已经包含 `input`（精确匹配）→ `undefined`，参见 Property 10
 * 3. 否则交给 fuse 走 `threshold: 0.4` 的搜索；搜索结果按 score 升序，
 *    `results[0]` 即最佳匹配
 * 4. 防御性校验 `score`：在 fuse 已自带阈值的前提下再兜一道，避免类型上
 *    `score?: number` 的不确定带来意外
 */
function suggest(input: string, candidates: string[]): string | undefined {
  if (input.length === 0 || candidates.length === 0) {
    return undefined;
  }

  // Property 10：完全相等的输入不应被作为「你是不是想要 X」的建议返回。
  if (candidates.includes(input)) {
    return undefined;
  }

  const fuse = new Fuse(candidates, {
    includeScore: true,
    threshold: FUZZY_THRESHOLD,
  });

  const results = fuse.search(input);
  if (results.length === 0) {
    return undefined;
  }

  const best = results[0];
  if (best.score === undefined || best.score > FUZZY_THRESHOLD) {
    return undefined;
  }

  return best.item;
}

/**
 * 在工具 id 候选集合中为用户输入找出最接近的一个。
 *
 * @param input      用户实际输入的工具 id（可能拼错）
 * @param candidates 全部已知工具 id（builtin ∪ user）
 * @returns          最接近的 id，或 `undefined`（输入与候选都不够像 / 输入与
 *                   某个候选完全相等 / 输入或候选为空）
 *
 * @example
 *   suggestToolId('clade', ['claude', 'codex']);   // 'claude'
 *   suggestToolId('xyz',   ['claude', 'codex']);   // undefined
 *   suggestToolId('claude', ['claude', 'codex']);  // undefined（精确匹配）
 */
export function suggestToolId(input: string, candidates: string[]): string | undefined {
  return suggest(input, candidates);
}

/**
 * 在「某工具已配置的操作名」候选集合中为用户输入找出最接近的一个。
 *
 * 行为与 {@link suggestToolId} 完全一致；分开命名仅为提高调用点可读性。
 *
 * @param input      用户实际输入的操作名（可能拼错）
 * @param candidates 该工具已配置的操作名集合（仅包含 `commands[k] !== undefined` 的键）
 * @returns          最接近的操作名，或 `undefined`
 *
 * @example
 *   suggestOp('instal',   ['install', 'update', 'uninstall']); // 'install'
 *   suggestOp('docs',     ['install', 'update', 'uninstall']); // undefined
 *   suggestOp('install',  ['install', 'update', 'uninstall']); // undefined（精确匹配）
 */
export function suggestOp(input: string, candidates: string[]): string | undefined {
  return suggest(input, candidates);
}
