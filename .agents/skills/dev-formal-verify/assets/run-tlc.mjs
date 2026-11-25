#!/usr/bin/env node
// 使用本地 Java 与 TLC；所有证据写入新目录，保留 TLC 原始退出状态。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function main(argv = process.argv.slice(2)) {
  try {
    if (argv.length !== 3 || !argv[2])
      throw new Error("用法：node run-tlc.mjs MODEL.tla CONFIG.cfg NEW_OUTPUT_DIRECTORY（指定目标项目 temp/dev/ 下的新目录）");
    const jar = process.env.TLA2TOOLS;
    if (!jar || !path.isAbsolute(jar) || !fs.statSync(jar, { throwIfNoEntry: false })?.isFile())
      throw new Error("请设置 TLA2TOOLS 为本地 tla2tools.jar 的绝对路径");
    const model = fs.realpathSync(argv[0]);
    const config = fs.realpathSync(argv[1]);
    if (!fs.statSync(model).isFile() || !fs.statSync(config).isFile()) throw new Error("模型和配置必须是常规文件");
    const output = path.resolve(argv[2]);
    if (fs.lstatSync(output, { throwIfNoEntry: false })) throw new Error("输出目录已存在，请指定新目录");
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.mkdirSync(output);
    const java = process.env.JAVA || "java";
    const version = fs.openSync(path.join(output, "java-version.txt"), "wx");
    let checked;
    try { checked = spawnSync(java, ["-version"], { stdio: ["ignore", version, version] }); }
    finally { fs.closeSync(version); }
    if (checked.error || checked.status !== 0) throw new Error(`无法运行 Java：${checked.error?.message ?? checked.status}`);
    const log = fs.openSync(path.join(output, "tlc.out"), "wx");
    let result;
    try {
      result = spawnSync(java, ["-XX:+UseParallelGC", "-cp", jar, "tlc2.TLC", "-workers", "1", "-fp", "0", "-lncheck", "final", "-metadir", path.join(output, "states"), "-config", config, path.basename(model, ".tla")], {
        cwd: path.dirname(model), stdio: ["ignore", log, log],
      });
    } finally { fs.closeSync(log); }
    if (result.error) throw result.error;
    const status = result.status ?? 2;
    fs.writeFileSync(path.join(output, "exit-code.txt"), `${status}\n`, { flag: "wx" });
    process.stdout.write(fs.readFileSync(path.join(output, "tlc.out")));
    console.log(`\nTLC 原始退出码：${result.status ?? `信号 ${result.signal}`}；证据目录：${output}`);
    return status;
  } catch (error) { console.error(error.message); return 2; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
