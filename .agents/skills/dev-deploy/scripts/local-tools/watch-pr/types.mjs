

export function nonEmpty   (items              )                     {
  return items.length === 0 ? null : [items[0], ...items.slice(1)];
}
export function parsePrNumber(value         , label = "PR 编号")           {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
    throw new Error(`${label} 必须是正整数`);
  return value            ;
}

/**
 * `frontier` 指明实际处于等待状态的最低未合并 PR，
 * `pending` 只包含该 PR 的检查。把每行的待完成检查都归到最底层 PR，
 * 会把上层等待错误归因到合并前沿。
 *
 * 这个决定用于 single 和 `--stack` 模式。队列模式有意报告自己的
 * 合并前沿：该 PR 没有阻塞时，发出 merge-queue 等待，忽略上层待完成检查，
 * 因为上层检查不会阻塞前沿合并。这是队列观察协议的契约，
 * 不是归因错误。
 */
