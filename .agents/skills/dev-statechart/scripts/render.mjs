#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const usage = `用法：node render.mjs CHART.mmd --out FILE.svg

使用本地 Pele 1.9.0 把 Mermaid 状态图渲染为 SVG，并嵌入完整浅色/深色主题。
指定目标项目 temp/dev/ 下的输出文件，已有文件不会被覆盖。
可选 STATECHART_PELE_MODULE 指向已经安装的本地 Pele 模块入口。
本命令不下载依赖，不发送模型到远程服务。`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string" }, help: { type: "boolean" } },
  });
  if (values.help) { console.log(usage); process.exit(0); }
  if (positionals.length !== 1 || !values.out) throw new Error(usage);
  const source = path.resolve(positionals[0]);
  if (path.extname(source) !== ".mmd") throw new Error("输入文件必须使用 .mmd 扩展名。");
  const output = path.resolve(values.out);
  if (path.extname(output) !== ".svg") throw new Error("输出文件必须使用 .svg 扩展名。");
  if (fs.existsSync(output)) throw new Error(`输出文件已存在：${output}。请选择新文件名。`);
  const text = fs.readFileSync(source, "utf8");
  const theme = fs.readFileSync(path.join(import.meta.dirname, "../assets/theme.css"), "utf8");
  let module;
  try {
    module = await import(process.env.STATECHART_PELE_MODULE
      ? pathToFileURL(path.resolve(process.env.STATECHART_PELE_MODULE)).href : "pele");
  } catch (error) {
    throw new Error(`无法加载本地 Pele 1.9.0，请按本技能运行环境说明准备依赖。保留原 Mermaid 文本。\n${error.message}`, { cause: error });
  }
  if (typeof module.render !== "function") throw new Error("本地渲染模块未导出 render()。");
  const { svg } = module.render(text, { limit: 1_000_000, outputLimit: 8_000_000, maxEdges: 10_000 });
  if (typeof svg !== "string" || !/<svg\b[^>]*>/.test(svg)) throw new Error("渲染模块没有返回有效 SVG 文本。");
  const themed = svg.replace(/(<svg\b[^>]*>)/, `$1\n<style>\n${theme}\n</style>`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, themed, { flag: "wx" });
  console.log(`已写入 ${output}`);
} catch (error) {
  console.error(`SVG 渲染未完成：${error.message ?? String(error)}`);
  process.exitCode = 2;
}
