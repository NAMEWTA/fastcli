#!/usr/bin/env node
// 向可选决策日志追加一行，不截断已有文件。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function clean(value) {
  const text = value.replace(/[\t\n\r]/g, " ");
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length !== 6) {
    console.error("用法：node append-decision-tsv.mjs <logfile> <phase> <decision> <why> <evidence> <result>");
    return 1;
  }
  const [logfile, ...fields] = argv;
  try {
    fs.mkdirSync(path.dirname(logfile), { recursive: true });
    const fd = fs.openSync(logfile, "a");
    try {
      // 始终用追加模式。即使挂载上的元数据过期，也不会覆盖整份日志。
      if (fs.fstatSync(fd).size === 0) fs.writeSync(fd, "ts\tphase\tdecision\twhy\tevidence\tresult\n");
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      fs.writeSync(fd, [timestamp, ...fields.map(clean)].join("\t") + "\n");
    } finally { fs.closeSync(fd); }
    return 0;
  } catch (error) { console.error(`无法追加决策记录：${error.message}`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
