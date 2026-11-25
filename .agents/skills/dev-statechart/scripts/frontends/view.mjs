import {                   checked, list,                       } from "../ir.mjs";

const projected = new WeakMap              ();

export const json = (v       )       => {
  if (typeof v !== "object") return v;
  if (v.kind === "model") return v.name;
  let j = projected.get(v);
  if (j === undefined) {
    if (v.kind === "interval") {
      const members         = [];
      for (let k = v.lo; k <= v.hi; k++) members.push(k);
      j = members;
    } else if (v.kind === "set") {
      const members         = [];
      for (const m of v.members) members.push(json(m));
      j = members;
    } else {
      const fields                   = [];
      for (let i = 0; i < v.keys.length; i++) {
        const k = json(v.keys[i]);
        fields.push([typeof k === "object" ? JSON.stringify(k) : String(k), json(v.values[i])]);
      }
      j = Object.fromEntries(fields);
    }
    projected.set(v, j);
  }
  return j;
};

const projectedVars = new WeakMap                                ();

const jsonVars = (vars      ) => {
  let j = projectedVars.get(vars);
  if (j === undefined) {
    const fields                   = [];
    for (const [name, v] of Object.entries(vars)) fields.push([name, json(v)]);
    j = Object.fromEntries(fields);
    projectedVars.set(vars, j);
  }
  return j;
};

const THEME_COLORS = ["blue", "orange", "purple", "yellow", "teal", "tan", "pink"];

const isFunction = (v         )                                       => typeof v === "function";

const isPlainObject = (v         )                                  => {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const isString = (v         ) => typeof v === "string";

const VIEW_EXPORTS = ["state", "step", "group", "colors", "title"];

export function checkView(
  view                                      ,
  inspect         ,
)              {
  const literal = (v         ) =>
    typeof v === "string" ? JSON.stringify(v) : inspect(v, { breakLength: Infinity });
  const extra           = [];
  for (const name of Object.keys(view)) if (!VIEW_EXPORTS.includes(name)) extra.push(name);
  if (extra.length)
    throw new Error(
      `视图导出了命令不读取的 ${list(extra)}。仅导出 ${list(VIEW_EXPORTS)}。`,
    );
  const wrong           = [];
  const pick =    (name        , kind        , fits                        ) => {
    const v = view[name];
    if (v === undefined || fits(v)) return v;
    wrong.push(`${name} 必须是${kind}`);
    return undefined;
  };
  const state = pick("state", "函数", isFunction);
  const step = pick("step", "函数", isFunction);
  const group = pick("group", "函数", isFunction);
  const exported = pick("colors", "普通对象", isPlainObject);
  const title = pick("title", "字符串", isString);
  if (wrong.length) throw new Error(`视图的 ${list(wrong)}。`);
  if (group !== undefined && exported === undefined)
    throw new Error("视图导出了 group()，却没有导出 colors。请在 colors 中为每个分组指定颜色。");
  const colors                              = Object.create(null);
  const bad           = [];
  for (const [name, color] of Object.entries(exported ?? {})) {
    if (typeof color === "string" && THEME_COLORS.includes(color)) colors[name] = color;
    else bad.push(`${JSON.stringify(name)} 对应颜色 ${literal(color)}`);
  }
  if (bad.length)
    throw new Error(
      `视图的 colors 指定了 ${list(bad)}。每个分组应使用 ${list(THEME_COLORS, "或")}。`,
    );
  const named =
    group &&
    ((vars      ) => {
      const g = group(jsonVars(vars));
      if (g !== undefined && !Object.hasOwn(colors, typeof g === "symbol" ? g : String(g)))
        throw new Error(
          `视图的 group() 返回了 colors 未定义的 ${literal(g)}。请在 colors 中为每个分组指定颜色。`,
        );
      return g;
    });
  return {
    state: state && ((vars      ) => state(jsonVars(vars))),
    step:
      step &&
      ((action        , from      , to      ) => step(action, jsonVars(from), jsonVars(to))),
    group: named,
    colors,
    title,
    [checked]: true,
  };
}
