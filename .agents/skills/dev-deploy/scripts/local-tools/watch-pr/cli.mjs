import { setTimeout as delay } from "node:timers/promises";
import { parseArgs as parseNodeArgs } from "node:util";

import {
  GhGitHubReader,
  WatcherQueryError,
  discoverStack,
  resolveContext,
} from "./github.mjs";
import {
  runQueued,
  runSimple,
  statusQueryVerdict,
  verdictFactory,

} from "./policy.mjs";
import { renderJson, renderPretty } from "./render.mjs";

import { nonEmpty, parsePrNumber } from "./types.mjs";

class CliUsageError extends Error {
  constructor(message, exitCode = 64) { super(message); this.exitCode = exitCode; }
}

const HELP = `用法：watch-pr [选项]

观察一个 PR、相连的 PR 堆叠，或固定的队列堆叠。
默认输出 JSON（轮询时为 NDJSON）；--pretty 输出供人阅读的文字。

选项：
  --owner OWNER             GitHub 仓库所有者
  --repo REPO               GitHub 仓库名称
  --pr NUMBER               PR 编号
  --stack                   观察相连且尚未关闭的 PR 堆叠
  --queued-stack            观察已记录的堆叠，直到全部 PR 合并
  --stack-prs N,...          固定的自底向上队列（仅队列模式）
  --interval SECONDS        轮询间隔（默认：60）
  --sweep-interval SECONDS  完整堆叠扫描间隔（默认：300）
  --timeout SECONDS         截止时间；0 表示不设截止时间（默认：0）
  --max-query-errors COUNT  连续查询错误允许次数（默认：5）
  --status-only             输出一次状态表并以 0 退出
  --allow-draft             不把草稿状态作为合并门槛
  --pretty                  输出供人阅读的文字
  -h, --help                显示命令帮助
`;

export function parseArgs(argv, io) {
  try {
    const { values: raw } = parseNodeArgs({ args: [...argv], options: {
      owner: { type: "string" }, repo: { type: "string" }, pr: { type: "string" },
      stack: { type: "boolean", default: false }, "queued-stack": { type: "boolean", default: false },
      "stack-prs": { type: "string" }, interval: { type: "string", default: "60" },
      "sweep-interval": { type: "string", default: "300" }, timeout: { type: "string", default: "0" },
      "max-query-errors": { type: "string", default: "5" }, "status-only": { type: "boolean", default: false },
      "allow-draft": { type: "boolean", default: false }, pretty: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    } });
    if (raw.help) { io.stdout(HELP); throw new CliUsageError("", 0); }
    if (raw.stack && raw["queued-stack"]) throw new Error("--stack 不能与 --queued-stack 同时使用");
    if (raw["stack-prs"] !== undefined && !raw["queued-stack"]) throw new Error("--stack-prs 必须与 --queued-stack 一起使用");
    const number = (key, integer = false, zero = false) => {
      const value = Number(raw[key]);
      if (!Number.isFinite(value) || (integer && !Number.isInteger(value)) || (zero ? value < 0 : value <= 0))
        throw new Error(`option '--${key} <${integer ? "count" : "seconds"}>' argument '${raw[key]}' is invalid：${zero ? "必须大于或等于零" : integer ? "必须是正整数" : "必须大于零"}`);
      return value;
    };
    const prNumber = (value) => {
      try { return parsePrNumber(Number(value.replace(/^#/, ""))); }
      catch { throw new Error("PR 编号必须是正整数"); }
    };
    const stackPrs = raw["stack-prs"] === undefined ? [] : raw["stack-prs"].split(",").map((part) => prNumber(part.trim()));
    if (new Set(stackPrs).size !== stackPrs.length) throw new Error("--stack-prs 包含重复的 PR");
    return {
      owner: raw.owner ?? null, repo: raw.repo ?? null, pr: raw.pr === undefined ? null : prNumber(raw.pr),
      mode: raw["queued-stack"] ? "queued-stack" : raw.stack ? "stack" : "single",
      stackPrs, statusOnly: raw["status-only"], pretty: raw.pretty,
      polling: { interval: number("interval"), sweepInterval: number("sweep-interval"), timeout: number("timeout", false, true), maxQueryErrors: number("max-query-errors", true), allowDraft: raw["allow-draft"] },
    };
  } catch (error) {
    if (error instanceof CliUsageError) throw error;
    io.stderr(`error: ${error.message}\n`);
    throw new CliUsageError(error.message);
  }
}

function realRuntime()             {
  return {
    reader: new GhGitHubReader(),
    clock: {
      now: () => performance.now() / 1_000,
      observedAt: () => new Date().toISOString(),
      sleep: async (seconds) => {
        await delay(seconds * 1_000);
      },
    },
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  };
}
export async function main(
  argv                   ,
  runtime             = realRuntime()
)                  {
  let options            ;
  try {
    options = parseArgs(argv, runtime);
  } catch (error) {
    if (!(error instanceof CliUsageError)) throw error;
    return error.exitCode === 0 ? 0 : 64;
  }
  const render = options.pretty ? renderPretty : renderJson;
  const emit = (verdict                   )       =>
    runtime.stdout(render(verdict));
  let contexts                         ;
  try {
    const seed = await resolveContext({
      reader: runtime.reader,
      owner: options.owner,
      repo: options.repo,
      pr: options.pr ?? options.stackPrs[0] ?? null,
    });
    contexts =
      nonEmpty(options.stackPrs.map((number) => ({ ...seed, number }))) ??
      (options.mode === "single"
        ? [seed]
        : await discoverStack(runtime.reader, seed));
  } catch (error) {
    if (!(error instanceof WatcherQueryError)) throw error;
    const verdict = statusQueryVerdict(
      verdictFactory(runtime.clock, options.mode),
      1,
      error.failure
    );
    runtime.stdout(render(verdict));
    return verdict.exitCode;
  }
  const dependencies = { reader: runtime.reader, clock: runtime.clock, emit };
  const verdict =
    options.mode === "queued-stack" && !options.statusOnly
      ? await runQueued({ dependencies, contexts, options: options.polling })
      : await runSimple({
          dependencies,
          contexts,
          mode: options.mode,
          statusOnly: options.statusOnly,
          options: options.polling,
        });
  runtime.stdout(render(verdict));
  return verdict.exitCode;
}
