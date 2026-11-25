#!/usr/bin/env node
// 在隔离副本中检查示例实现、注入真实故障并核对恢复结果。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function main() {
  const skill = path.dirname(import.meta.dirname);
  const checker = path.join(skill, "scripts/check-model.mjs");
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "formal-example-"));
  try {
    const target = path.join(folder, "example");
    fs.cpSync(path.join(skill, "assets/example"), target, { recursive: true });
    const implementation = path.join(target, "implementation.mjs");
    const original = fs.readFileSync(implementation);
    const command = [checker, path.join(target, "model.mjs"), "--max-states", "100", "--max-transitions", "1000"];
    function run(label, expected) {
      const result = spawnSync(process.execPath, command, { encoding: "utf8", timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
      console.log(`\n## ${label}（退出码 ${result.status}）\n`);
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      if (result.error) throw result.error;
      if (result.status !== expected) throw new Error(`${label}预期退出码 ${expected}，实际为 ${result.status}`);
    }
    run("原实现", 0);
    const guard = "if (state.available < 1) { // 故障注入只移除此处保护。";
    const text = original.toString("utf8");
    if (text.split(guard).length !== 2) throw new Error("无法唯一定位演示保护；未修改文件");
    try {
      fs.writeFileSync(implementation, text.replace(guard, "if (false) { // 临时故障：跳过提交时的余量检查。"));
      run("隔离副本移除提交保护", 1);
    } finally {
      fs.writeFileSync(implementation, original);
    }
    if (!fs.readFileSync(implementation).equals(original)) throw new Error("隔离副本未恢复");
    run("恢复原实现", 0);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
  console.log("\n示例完成：三次均为实际有限状态枚举；没有执行 TLC，也没有改动用户产品代码。");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`演示失败：${error.message}`); process.exitCode = 2; }
}
