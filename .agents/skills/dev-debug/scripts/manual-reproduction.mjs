#!/usr/bin/env node
// 人机协作的复现循环。复制此文件，修改下方步骤，再由用户在自己的终端运行。
// step 展示操作后等待 Enter；capture 收集单行观察结果。不要收集密码或令牌。
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline";

export async function main() {
  const input = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY) });
  const lines = input[Symbol.asyncIterator]();
  async function answer(prompt) {
    process.stdout.write(prompt);
    const next = await lines.next();
    if (next.done) throw new Error("输入已结束，复现尚未完成");
    return next.value;
  }
  async function step(instruction) { await answer(`\n>>> ${instruction}\n    [完成后按 Enter] `); }
  async function capture(question) { return answer(`\n>>> ${question}\n    > `); }
  try {
    // 修改下面的操作与问题，使其对应用户需要复现的真实路径。
    await step("打开 http://localhost:3000 上的应用并登录。");
    const errored = await capture("点击‘导出’按钮。是否出现错误？（y/n）");
    const errorMessage = await capture("粘贴错误消息（没有则填 none）：");
    process.stdout.write(`\n--- 已收集 ---\nERRORED=${errored}\nERROR_MSG=${errorMessage}\n`);
    return 0;
  } finally { input.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(`复现中断：${error.message}`); process.exitCode = 1; }
}
