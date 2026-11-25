#!/usr/bin/env node
import {                    spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { killGroup, messageOf } from "./run.mjs";

const USAGE = `用法：statechart SPEC.tla [--config FILE] [--view FILE] --out DIR

使用 TLC 检查 SPEC.tla，并把状态图绘制为 Mermaid。超过 500 个状态时，只绘制
通向违规规则的路径；没有违规规则时，不生成 chart.mmd。
  --config FILE  TLC 配置。默认为规格旁的 SPEC.cfg。
  --view FILE    导出 state(vars) 的模块，还可导出 step(action, from, to)、
                 group(vars)、colors 和 title。state() 返回字符串时生成平面图，
                 数组生成父状态，对象生成并行区域。默认显示各状态的值。
                 colors 为每个分组指定 blue、orange、purple、yellow、teal、tan 或 pink。
  --out DIR      写入 report.md、chart.mmd、tlc.out，以及每个违规时序属性和
                 图中未显示的违规规则的 tlc-RULE.out。指定目标项目 temp/dev/ 下的新目录或空目录。
退出码对应原样配置的 TLC 结果：全部规则成立为 0，规则被违反为 1，TLC 错误、
信号终止检查或命令无法运行为 2。SIGINT 和 SIGTERM 分别返回 130 和 143。
只有退出码 0 和 1 会写出结果。`;

let stop                            ;
const stopped = new Promise      ((resolve) => {
  for (const name of ["SIGINT", "SIGTERM"]         )
    process.on(name, () => {
      stop ??= name;
      resolve();
    });
});

let flags;
let specFile;
try {
  const args = parseArgs({
    allowPositionals: true,
    options: { help: { type: "boolean" }, config: { type: "string" }, view: { type: "string" }, out: { type: "string" } },
  });
  flags = args.values;
  if (flags.help) { console.log(USAGE + "\n本地依赖：设置 TLA2TOOLS 为 tla2tools.jar 的绝对路径，可选 JAVA 指定 Java 11+ 可执行文件。命令不联网。\n--help 显示帮助。"); process.exit(0); }
  [specFile] = args.positionals;
  if (args.positionals.length !== 1) throw new Error("请提供一个 SPEC.tla。");
  if (!flags.out) throw new Error("请用 --out DIR 指定本轮输出目录。");
} catch (error) {
  console.error(`${messageOf(error)}\n\n${USAGE}`);
  process.exit(2);
}

const codeOf = (error         ) =>
  error instanceof Error && "code" in error ? error.code : undefined;

try {
  const configFile = flags.config ?? specFile.replace(/\.tla$/, ".cfg");
  if (!fs.existsSync(configFile))
    throw new Error(`找不到 TLC 配置 ${configFile}。请传入 --config FILE。`);
  const out = flags.out;
  let entries           = [];
  let dest        ;
  try {
    entries = fs.readdirSync(out);
    dest = fs.realpathSync(out);
  } catch (error) {
    if (codeOf(error) !== "ENOENT")
      throw new Error(
        `${out} 不能用作输出目录。${messageOf(error)}。请通过 --out 指定新目录。`,
        { cause: error },
      );
    if (fs.lstatSync(out, { throwIfNoEntry: false }))
      throw new Error(
        `${out} 不能用作输出目录，因为它是失效链接。请通过 --out 指定新目录。`,
        { cause: error },
      );
    dest = path.resolve(out);
  }
  if (entries.length)
    throw new Error(
      `${out} 非空，包含 ${entries.sort()[0]}。命令只写入新目录或空目录。请通过 --out 指定新目录。`,
    );

  const base = path.dirname(dest);
  fs.mkdirSync(base, { recursive: true });
  const stage = fs.mkdtempSync(path.join(base, `.${path.basename(dest)}.statechart-`));
  const done = path.join(stage, "done");
  let tmp                    ;
  let janitor                          ;
  let exitCode        ;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-"));
    const runtime = process.execArgv;
    const worker = spawn(
      process.execPath,
      [
        ...runtime,
        path.join(import.meta.dirname, "worker.mjs"),
        stage,
        specFile,
        configFile,
        ...(flags.view ? [flags.view] : []),
      ],
      {
        detached: true,
        stdio: ["ignore", "inherit", "inherit"],
        env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp },
      },
    );
    janitor = spawn(
      process.execPath,
      [path.join(import.meta.dirname, "cleanup.mjs"), String(worker.pid), stage, tmp],
      { detached: true, stdio: ["pipe", "ignore", "ignore"] },
    );
    janitor.on("error", () => {});
    const exited = new Promise        ((resolve) =>
      worker.once("error", () => resolve(2)).once("exit", (code) => resolve(code ?? 2)),
    );
    await Promise.race([stopped, exited]);
    await killGroup(worker.pid          );
    const verdict = await exited;
    if (stop) {
      console.error(`${stop} 停止了检查，命令未写出结果。`);
      exitCode = 128 + os.constants.signals[stop];
    } else if (worker.signalCode) {
      console.error(`${worker.signalCode} 终止了检查，命令未写出结果。`);
      exitCode = 2;
    } else if ((verdict === 0 || verdict === 1) && fs.existsSync(done)) {
      try {
        try {
          fs.renameSync(done, dest);
        } catch (error) {
          if (process.platform !== "win32" || !["EEXIST", "EPERM", "ENOTEMPTY"].includes(codeOf(error))) throw error;
          // Windows 不一定允许 rename 替换空目录。rmdir 只移除空目录；
          // 检查期间出现文件时会失败，绝不递归删除已有目标。
          fs.rmdirSync(dest);
          try { fs.renameSync(done, dest); }
          catch (publishError) {
            try { fs.mkdirSync(dest); } catch { /* 已出现的目标保持原样。 */ }
            throw publishError;
          }
        }
      } catch (error) {
        if (codeOf(error) !== "ENOTEMPTY" && codeOf(error) !== "EEXIST") throw error;
        throw new Error(
          `检查期间出现了 ${path.join(out, fs.readdirSync(dest).sort()[0])}，命令未写出结果。请通过 --out 指定新目录。`,
          { cause: error },
        );
      }
      process.stdout.write(fs.readFileSync(path.join(dest, "report.md")));
      console.log(`\n已写入 ${out}`);
      exitCode = verdict;
    } else exitCode = 2;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    janitor?.kill("SIGKILL");
  }
  process.exit(exitCode);
} catch (error) {
  console.error(messageOf(error));
  process.exit(2);
}
