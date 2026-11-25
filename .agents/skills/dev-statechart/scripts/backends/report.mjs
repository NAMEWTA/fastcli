import {

  CHART_STATES,

  hasSection,
  list,
  must,

  RERUN_STATES,
  ruleKey,

} from "../ir.mjs";

const stepsOf = (story       ) => {
  const path                                     = [];
  for (const { step, state } of story) {
    const parts           = [];
    for (const [name, names] of Object.entries(state))
      parts.push((name ? `${name} ` : "") + names.join(" / "));
    path.push({ step, state: parts.join(", ") });
  }
  return path;
};

const forever = (loop                     , stutters                     ) => {
  const quoted = new Set        ();
  for (const p of loop) quoted.add(`"${p.state}"`);
  const runs = [...quoted];
  if (stutters) return `运行永久停在 ${runs[0]}。`;
  return runs.length === 1
    ? `运行永久停留在 ${runs[0]}。`
    : `运行在 ${list(runs)} 之间无限循环。`;
};

const fenced = (text        ) => ["```", text, "```"].join("\n");

export function report(
  {
    spec,
    graph,
    paths,
    rules,
    properties,
    stop,
    drawing,
    states,
  }

   ,
  found       ,
  chart                   ,
  stories                 ,
) {
  let size = 0;
  let arrows = 0;
  for (const r of chart?.regions ?? []) {
    size += r.states.length;
    arrows += r.steps.length;
  }
  let past = 0;
  let pastSteps = 0;
  let excluded = 0;
  for (const s of graph.states.values()) {
    if (s.excluded) excluded++;
    else if (s.past) past++;
  }
  for (const t of graph.steps) if (must(graph.states, t.to).past) pastSteps++;
  const includes = (n        ) =>
    chart ? `，图表包含${n === 1 ? "它" : "它们"}` : "";
  const out = [
    `# ${spec.module}`,
    "",
    paths
      ? `TLC 到达的状态${states.complete && !states.cut && states.distinct > CHART_STATES ? `共 ${states.distinct.toLocaleString("en-US")} 个，` : "数"}超过图表预算 ${CHART_STATES}，因此${chart ? `图表只绘制缺陷路径：${size} 个状态、${arrows} 条箭头` : "命令未写出 chart.mmd"}。`
      : `TLC 到达 ${graph.states.size - past - excluded} 个状态和 ${graph.steps.length - pastSteps} 个步骤。图表绘制 ${size} 个状态和 ${arrows} 条箭头。`,
  ];
  if (drawing)
    out.push(
      `TLC 绘图运行以 ${drawing.status} 退出，因此图表仅绘制停止前到达的状态。`,
    );
  if (!paths && !drawing && graph.states.size === past + excluded)
    out.push(
      states.initial
        ? "所有初始状态均在约束范围之外，因此 TLC 未探索任何初始状态。"
        : "TLC 未找到满足 Init 的状态，因此没有状态可违反规则；这不证明实际系统满足规则。",
    );
  if (past)
    out.push(
      `${past} 个约束范围外的状态分别是某条规则路径的终点${includes(past)}。TLC 检查约束范围外状态中的规则，但不会继续探索其后继状态。`,
    );
  if (excluded)
    out.push(
      `${excluded} 个被约束排除的步骤分别位于某条规则路径的末尾${includes(excluded)}。TLC 检查这些步骤之后的规则，但不会执行该步骤以继续探索。`,
    );
  if (chart?.inside)
    out.push(`图表未绘制停留在同一图中状态内的 ${chart.inside} 个步骤。`);
  if (chart?.quiet)
    out.push(`视图隐藏了 ${chart.quiet} 个步骤，图表未绘制它们。`);
  for (const { rule, outcome } of rules)
    if (
      !paths &&
      rule.kind === "deadlock" &&
      outcome === "broken" &&
      (drawing || hasSection(spec, "CONSTRAINT", "ACTION_CONSTRAINT"))
    )
      out.push(
        drawing
          ? "图表只标记 TLC 报告的死锁，因为绘图运行在遍历全部状态之前停止。"
          : "图表只标记 TLC 报告的死锁。存在 CONSTRAINT 或 ACTION_CONSTRAINT 时，图中没有出边的状态仍可能有被约束排除的步骤，TLC 不会将其计为死锁。",
      );
  if (chart?.lie) out.push(`${chart.lie} 因此图表改用父状态表示，不绘制并行区域。`);
  out.push(...(chart?.notes ?? []));
  const merged           = [];
  for (const k of ["VIEW", "SYMMETRY"]) if (hasSection(spec, k)) merged.push(k);
  if (chart && merged.length)
    out.push(
      `使用 ${list(merged)} 时，TLC 为每组被视为相同的状态保留一个代表。箭头可能指向代表状态，而非该步骤实际到达的状态。`,
    );
  for (const bug of found) {
    const steps = `${bug.path.length} 步`;
    out.push("", `## 违反 ${bug.rule.name}`);
    out.push(
      bug.rule.kind === "property"
        ? `TLC 反例位于 tlc-${bug.rule.name}.out，共 ${steps}：`
        : `最短路径共 ${steps}：`,
    );
    const path = stepsOf(must(stories, bug));
    for (const [i, p] of path.entries()) out.push(`${i}. ${p.step ? `${p.step}: ` : ""}${p.state}`);
    if (bug.loop !== undefined) out.push(forever(path.slice(bug.loop), bug.stutters));
  }
  const drawn = new Set        ();
  for (const b of found) drawn.add(ruleKey(b.rule));
  const holds           = [];
  const unchecked           = [];
  for (const { rule, outcome, messages } of [...rules, ...properties]) {
    if (outcome === "holds") holds.push(rule.name);
    else if (outcome === "not checked") unchecked.push(rule.name);
    else if (messages && !drawn.has(ruleKey(rule)))
      out.push(
        "",
        `## 违反 ${rule.name}`,
        `TLC 找到了反例，保存在 tlc-${rule.name}.out。`,
      );
  }
  if (holds.length) out.push("", "## 在已检查范围内成立的规则", holds.join(", "));
  if (unchecked.length) out.push("", "## 未完成检查的规则", unchecked.join(", "));
  if (unchecked.length && states.cut)
    out.push(
      `第一次违规后，每轮 TLC 运行到达 ${RERUN_STATES.toLocaleString("en-US")} 个不同状态时停止。本轮在每个状态中完成${unchecked.length === 1 ? "该规则" : "这些规则"}的检查之前已达到边界。`,
    );
  if (stop)
    out.push(
      ...(unchecked.length
        ? [
            `TLC 在完成${unchecked.length === 1 ? "该规则" : "这些规则"}的检查之前以 ${stop.status} 退出：`,
          ]
        : ["", "## TLC 已停止", `TLC 以 ${stop.status} 退出：`]),
      fenced(stop.message),
    );
  for (const p of properties)
    if (p.outcome === "holds" && p.initialOnly)
      out.push(
        `TLC 只在初始状态检查了 ${p.rule.name}，因为它不含 []、<> 或 ~>。要检查每个状态，请将其列为 INVARIANT。`,
      );
  return out.join("\n");
}
