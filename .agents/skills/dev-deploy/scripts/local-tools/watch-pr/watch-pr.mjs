#!/usr/bin/env node
// 仅使用 Node.js 标准库；实际 GitHub 读取仍通过项目已经认证的 gh。
const { main } = await import("./cli.mjs");
process.exitCode = await main(process.argv.slice(2));
