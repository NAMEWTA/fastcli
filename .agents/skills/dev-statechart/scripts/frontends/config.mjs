import { CHECK_DEADLOCK,             } from "../ir.mjs";

const isListField = (field                  )                     =>
  field === "invariants" ||
  field === "properties" ||
  field === "constraints" ||
  field === "actionConstraints";

const SECTIONS = new Map                 ();
for (const section of [
  { key: "CONSTANT", plural: "CONSTANTS" },
  { key: CHECK_DEADLOCK, field: "checkDeadlock" },
  { key: "INIT", field: "init", undefinedNoun: "初始谓词" },
  { key: "NEXT", field: "next", undefinedNoun: "后继状态动作" },
  { key: "SPECIFICATION", field: "spec", undefinedNoun: "名称" },
  { key: "VIEW", field: "view", undefinedNoun: "视图函数" },
  { key: "SYMMETRY", field: "symmetry", undefinedNoun: "对称函数" },
  { key: "TYPE", field: "type" },
  { key: "TYPE_CONSTRAINT", field: "typeConstraint" },
  { key: "INVARIANT", plural: "INVARIANTS", field: "invariants", undefinedNoun: "不变量" },
  { key: "PROPERTY", plural: "PROPERTIES", field: "properties", undefinedNoun: "属性" },
  { key: "CONSTRAINT", plural: "CONSTRAINTS", field: "constraints", undefinedNoun: "约束" },
  {
    key: "ACTION_CONSTRAINT",
    plural: "ACTION_CONSTRAINTS",
    field: "actionConstraints",
    undefinedNoun: "动作约束",
  },
]                    ) {
  SECTIONS.set(section.key, section);
  if (section.plural) SECTIONS.set(section.plural, section);
}
export const NAME = /^\w*[A-Za-z]\w*$/;
const WORD = /\w+/y;
const CONFIG_HOLDS =
  "配置只能包含名称、数字、字符串、注释，以及符号 { } ( ) [ ] , = ! <-。";
const shown = (c        ) => {
  const code = c.codePointAt(0) ?? 0;
  const hex = `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
  if (code < 0x20 || code === 0x7f) return hex;
  return code < 0x7f ? `"${c}"` : `"${c}" (${hex})`;
};

function tokenizeConfig(text        , cannot                                        ) {
  if (text.startsWith("\uFEFF"))
    throw cannot(1, "文件以字节顺序标记开头。请保存为不含该标记的 UTF-8 文件。");
  const tokens          = [];
  let line = 1;
  let last = 1;
  let i = 0;
  const skip = (to        ) => {
    for (; i < to; i++) {
      last = line;
      if (text[i] === "\n" || (text[i] === "\r" && text[i + 1] !== "\n")) line++;
    }
  };
  const push = (image        ) => {
    tokens.push({ image, line });
    skip(i + image.length);
  };
  while (i < text.length) {
    const c = text[i];
    const two = text.slice(i, i + 2);
    const start = line;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") skip(i + 1);
    else if (two === "\\*") {
      const end = text.slice(i).search(/[\n\r]/);
      skip(end < 0 ? text.length : i + end);
    } else if (two === "(*") {
      const marks = /\(\*|\*\)/g;
      let depth = 0;
      do {
        marks.lastIndex = i;
        const m = marks.exec(text);
        if (!m) throw cannot(start, "此处开始的注释没有结束。");
        depth += m[0] === "(*" ? 1 : -1;
        skip(m.index + 2);
      } while (depth);
    } else if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') {
        const ch = text[j];
        if (ch === undefined) throw cannot(start, "此处开始的字符串没有结束。");
        if (ch === "\n" || ch === "\r")
          throw cannot(
            start,
            "此处开始的字符串未在本行结束。请用 \\n 表示字符串内的换行。",
          );
        if (ch === "\0") throw cannot(start, "字符串含有 U+0000 字符。");
        if (ch === "\\" && text[j + 1] !== undefined && !'"\\ntrf'.includes(text[j + 1]))
          throw cannot(
            start,
            `字符串在 ${shown(text[j + 1])} 前包含反斜杠。字符串只能使用这些转义： \\" \\\\ \\n \\t \\r \\f.`,
          );
        j += ch === "\\" ? 2 : 1;
      }
      push(text.slice(i, j + 1));
    } else if (/\w/.test(c)) {
      WORD.lastIndex = i;
      const word = WORD.exec(text)?.[0] ?? c;
      if (/^[WS]F_/.test(word))
        throw cannot(
          start,
          `TLC 把单词开头的 ${word.slice(0, 3)} 识别为 TLA+ 关键字，因此无法把 ${word} 识别为名称。`,
        );
      if (!/[A-Za-z]/.test(word) && word !== "_") {
        if (/\D/.test(word))
          throw cannot(
            start,
            `TLC 把 ${word} 拆成 ${word.match(/\d+|_/g)?.join(" ")}，因为名称需要包含字母。`,
          );
        if (Number(word) > 2147483647)
          throw cannot(start, `TLC 无法读取超过 2147483647 的数字，例如 ${word}。`);
      }
      push(word);
    } else if (two === "<-") push(two);
    else if (["[]", "]_", "==", "=<", "!!"].includes(two))
      throw cannot(start, `TLC 把 ${two} 识别为一个 TLA+ 符号，而配置中不能包含它。`);
    else if ("{}()[],=!".includes(c)) push(c);
    else {
      const ch = String.fromCodePoint(text.codePointAt(i) ?? 0);
      const where = ch > "\x7f" ? "（位于字符串之外）" : "";
      throw cannot(start, `无法读取字符 ${shown(ch)}${where}。${CONFIG_HOLDS}`);
    }
  }
  return { tokens, end: last };
}

export function readConfig({ file, text }                                )         {
  const refuse = (line        , words        ) =>
    new Error(`TLC 拒绝配置 ${file} 的第 ${line} 行。${words}`);
  const cannot = (line        , words        ) =>
    new Error(`命令无法读取配置 ${file} 的第 ${line} 行。${words}`);
  const { tokens, end } = tokenizeConfig(text, cannot);
  const eof        = { image: "", line: end };
  let at = 0;
  const next = () => tokens[at++] ?? eof;
  let deferred                   ;
  const defer = (error       ) => (deferred ??= error);
  const defined = (t       , undefinedNoun                    ) => {
    if (!NAME.test(t.image))
      defer(
        refuse(
          t.line,
          `配置指定的${undefinedNoun} ${t.image} 未在规格中定义。`,
        ),
      );
  };
  const name = (t       , what        ) => {
    if (SECTIONS.has(t.image))
      defer(cannot(t.line, `TLC 会把关键字 ${t.image} 识别为${what}。`));
    else if (!NAME.test(t.image))
      defer(cannot(t.line, `TLC 会把 ${t.image} 识别为${what}，而它不是名称。`));
  };
  const value = (t       )       => {
    if (t === eof) throw refuse(t.line, "此处应为一个值，但未找到。");
    if (t.image === "{") {
      t = next();
      if (t.image === "}") return;
      value(t);
      while ((t = next()).image === ",") value(next());
      if (t.image !== "}") throw refuse(t.line, "此处应为 }，但未找到。");
    } else if (SECTIONS.has(t.image))
      defer(cannot(t.line, `TLC 会把关键字 ${t.image} 识别为一个值。`));
    else if (!NAME.test(t.image) && !/^(\d+|".*")$/.test(t.image))
      defer(
        cannot(
          t.line,
          `TLC 会把 ${t.image} 识别为一个值。值应为名称、数字、字符串或花括号内的集合。`,
        ),
      );
  };
  const constant = (t       , loc        ) => {
    name(t, "常量名");
    for (t = next(); t.image === "!"; t = next()) name((t = next()), "常量名");
    if (t.image === "<-") {
      t = next();
      if (t.image === "[") {
        t = next();
        if (t === eof) throw refuse(t.line, "<-[ 后应为标识符。");
        name(t, "模块名");
        t = next();
        if (t.image !== "]") throw refuse(t.line, "此处应为 ]，但未找到。");
        t = next();
        if (t === eof) throw refuse(t.line, "<-[mod] 后应为标识符。");
      } else if (t === eof) throw refuse(t.line, "<- 后应为标识符。");
      name(t, "<- 后的名称");
      return;
    }
    if (t.image === "(") {
      value(next());
      while ((t = next()).image === ",") value(next());
      if (t.image !== ")")
        throw refuse(
          loc,
          "TLC 未给出具体原因。运算符参数应为 ( ) 内用逗号分隔的一个或多个值。",
        );
      t = next();
    }
    if (t.image !== "=") throw refuse(t.line, "此处应为 = 或 <-，但未找到。");
    t = next();
    if (t.image === "[") {
      t = next();
      if (t === eof) throw refuse(t.line, "=[ 后应为标识符。");
      name(t, "模块名");
      t = next();
      if (t.image !== "]") throw refuse(t.line, "此处应为 ]，但未找到。");
      t = next();
    }
    value(t);
  };
  const config         = {
    sections: [],
    invariants: [],
    properties: [],
    constraints: [],
    actionConstraints: [],
  };
  for (let t = next(); t !== eof;) {
    const keyword = t;
    const section = SECTIONS.get(keyword.image);
    if (!section) throw refuse(t.line, "此处应为关键字，但未找到。");
    const { key, field, undefinedNoun } = section;
    const begin = at;
    if (field === undefined) {
      for (t = next(); t !== eof && !SECTIONS.has(t.image); t = next()) constant(t, keyword.line);
    } else if (isListField(field)) {
      for (t = next(); t !== eof && !SECTIONS.has(t.image); t = next()) {
        config[field].push(t.image);
        defined(t, undefinedNoun);
      }
    } else {
      t = next();
      if (t === eof)
        throw refuse(
          keyword.line,
          `关键字 ${keyword.image} 后没有标识符。`,
        );
      if (field === "checkDeadlock" && t.image !== "TRUE" && t.image !== "FALSE")
        throw refuse(t.line, "此处应为 TRUE 或 FALSE，但未找到。");
      if (config[field] !== undefined)
        throw refuse(keyword.line, `关键字 ${keyword.image} 出现了两次。`);
      if (field === "checkDeadlock") config[field] = t.image === "TRUE";
      else {
        config[field] = t.image;
        if (SECTIONS.has(t.image))
          defer(cannot(t.line, `TLC 会把关键字 ${t.image} 识别为 ${key} 后的名称。`));
        else if (undefinedNoun) defined(t, undefinedNoun);
      }
      t = next();
    }
    const images           = [];
    for (let k = begin; k < (t === eof ? tokens.length : at - 1); k++) images.push(tokens[k].image);
    config.sections.push({ key, line: keyword.line, tokens: images });
  }
  if (deferred) throw deferred;
  return config;
}
