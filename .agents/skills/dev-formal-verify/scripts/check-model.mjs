#!/usr/bin/env node
// 穷举可信 JavaScript 模型的有限可达图，检查状态不变量并保留最短反例。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

function positive(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error("预算必须是正整数");
  return number;
}

export async function loadModel(file) {
  const target = fs.realpathSync(file);
  if (!fs.statSync(target).isFile()) throw new Error("模型路径必须是常规文件");
  const model = await import(pathToFileURL(target).href);
  if (typeof model.initialStates !== "function") throw new Error("模型必须提供 initialStates()");
  if (typeof model.transitions !== "function") throw new Error("模型必须提供 transitions(state)");
  const rules = model.INVARIANTS;
  if (!rules || typeof rules !== "object" || Array.isArray(rules) || Object.keys(rules).length === 0)
    throw new Error("模型必须提供非空 INVARIANTS 对象");
  if (Object.entries(rules).some(([, rule]) => typeof rule !== "function"))
    throw new Error("INVARIANTS 必须把规则名称映射到布尔检查函数");
  return model;
}

// 全部状态值参与相等性，拒绝可变对象、隐藏字段和有损 JSON 值。
export function stateKey(state, ancestors = new Set()) {
  if (state === null || typeof state === "string" || typeof state === "boolean") return JSON.stringify(state);
  if (typeof state === "number" && Number.isFinite(state)) return Object.is(state, -0) ? "-0" : String(state);
  if (typeof state !== "object" || !Object.isFrozen(state))
    throw new Error("状态必须由有限数字、字符串、布尔值、null 和深度冻结的普通对象或数组组成");
  if (ancestors.has(state)) throw new Error("状态不能包含循环引用");
  const array = Array.isArray(state);
  if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(state)))
    throw new Error("状态不能包含类实例、Map、Set 或日期；请使用冻结的普通值");
  const keys = Reflect.ownKeys(state).filter((key) => !(array && key === "length"));
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(state, key);
    if (typeof key !== "string" || !field.enumerable || !("value" in field))
      throw new Error("状态不能包含符号、不可枚举字段或访问器");
  }
  if (array && (keys.length !== state.length || keys.some((key, i) => key !== String(i))))
    throw new Error("状态数组不能稀疏或附带额外字段");
  ancestors.add(state);
  try {
    return array
      ? `[${state.map((value) => stateKey(value, ancestors)).join(",")}]`
      : `{${keys.sort().map((key) => `${JSON.stringify(key)}:${stateKey(state[key], ancestors)}`).join(",")}}`;
  } finally {
    ancestors.delete(state);
  }
}

export function check(model, maxStates, maxTransitions, deadlocks = false) {
  positive(maxStates);
  positive(maxTransitions);
  const parents = new Map();
  const pending = [];
  const violations = new Map();
  let complete = true;
  let edges = 0;
  let processed = 0;
  let deadlockRule = "NoDeadlock";
  while (Object.hasOwn(model.INVARIANTS, deadlockRule)) deadlockRule = "CHECK_" + deadlockRule;

  function add(state, parent, action) {
    const key = stateKey(state);
    if (parents.has(key)) return true;
    if (parents.size >= maxStates) { complete = false; return false; }
    parents.set(key, { state, parent, action });
    pending.push(key);
    for (const [name, rule] of Object.entries(model.INVARIANTS)) {
      const result = rule(state);
      if (typeof result !== "boolean") throw new Error(`规则 ${name} 必须返回 boolean`);
      if (!result && !violations.has(name)) violations.set(name, key);
    }
    return true;
  }

  for (const initial of model.initialStates()) if (!add(initial, null, null)) break;
  if (parents.size === 0) throw new Error("模型没有初始状态，不能把空搜索称为通过");
  for (let cursor = 0; cursor < pending.length && complete; cursor += 1) {
    const key = pending[cursor];
    const { state } = parents.get(key);
    let outgoing = false;
    for (const [action, successor] of model.transitions(state)) {
      if (typeof action !== "string" || !action) throw new Error("每个迁移动作必须有非空字符串名称");
      if (edges >= maxTransitions) { complete = false; break; }
      edges += 1;
      outgoing = true;
      if (!add(successor, key, action)) break;
    }
    if (!outgoing && deadlocks && complete && !violations.has(deadlockRule)) violations.set(deadlockRule, key);
    processed += 1;
  }
  return { parents, violations, complete, processed, edges, deadlockRule: deadlocks ? deadlockRule : null };
}

export function report(model, result, maxStates, maxTransitions) {
  const { parents, violations, complete, processed, edges, deadlockRule } = result;
  const describe = model.describe ?? ((state) => JSON.stringify(state));
  const lines = [
    "# 有限状态不变量检查", "",
    `已发现 ${parents.size} 个状态，处理 ${processed} 个状态、${edges} 条迁移。`,
    `预算：${maxStates} 个状态、${maxTransitions} 条迁移。`,
    `搜索完成：${complete ? "是，已穷尽模型生成的可达图" : "否，达到预算；其余状态与规则结论未知"}。`,
    "范围：仅此模型生成的状态与迁移；不检查时序属性、公平性或任意规模。", "",
  ];
  for (const name of [...Object.keys(model.INVARIANTS), ...(deadlockRule ? [deadlockRule] : [])]) {
    const status = violations.has(name) ? "发现反例" : complete ? "在完整可达图中成立" : "已探索部分未发现反例，未完成验证";
    lines.push(`- ${name}：${status}。`);
  }
  for (const [name, key] of violations) {
    const steps = [];
    for (let current = key; ; ) {
      const item = parents.get(current);
      steps.push(item);
      if (item.action === null) break;
      current = item.parent;
    }
    steps.reverse();
    lines.push("", `## 反例：${name}`, "", `最短路径共 ${steps.length - 1} 步：`, "");
    for (const [index, { action, state }] of steps.entries())
      lines.push(`${index}. ${action ? action + "：" : ""}${describe(state)}`);
  }
  lines.push("", "该结果不是 TLC 执行结果，也不保证真实系统无缺陷；代码映射、原子性与环境假设仍须核对。");
  return lines.join("\n") + "\n";
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
      "max-states": { type: "string" }, "max-transitions": { type: "string", default: "100000" },
      deadlocks: { type: "boolean", default: false }, out: { type: "string" }, help: { type: "boolean", short: "h" },
    } });
    if (values.help) {
      console.log("用法：node check-model.mjs MODEL.mjs --max-states N [--max-transitions N] [--deadlocks] [--out NEW_REPORT.md]");
      return 0;
    }
    if (positionals.length !== 1 || values["max-states"] === undefined)
      throw new Error("请提供一个可信本地模型文件，并显式设置 --max-states");
    const maxStates = positive(values["max-states"]);
    const maxTransitions = positive(values["max-transitions"]);
    const model = await loadModel(path.resolve(positionals[0]));
    const result = check(model, maxStates, maxTransitions, values.deadlocks);
    const text = report(model, result, maxStates, maxTransitions);
    if (values.out) fs.writeFileSync(values.out, text, { encoding: "utf8", flag: "wx" });
    process.stdout.write(text);
    return result.violations.size ? 1 : result.complete ? 0 : 3;
  } catch (error) {
    console.error(`检查无法完成：${error.message}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  process.exitCode = await main();
