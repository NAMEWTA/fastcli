#!/usr/bin/env node
// 只读检查本地工作树；可选查询 PR 和明确指定的记录目录，不抓取引用或删除文件。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const USAGE = `用法：node worktree-audit.mjs [-b|--base REF] [--with-pr]
       [--transcripts DIRECTORY] [--] [REPOSITORY]

仓库路径默认为当前仓库；MERGED 只对照本地引用，不执行 fetch。
未指定 --base 时依次尝试 origin/HEAD、origin/main、origin/master。
--with-pr 才读取已认证 Origin 或 gh 的 PR；不登录或修改远端。
--transcripts 或 SKILLS_HUB_TRANSCRIPTS_DIR 只允许搜索明确给出的目录。
旧 SKILLS_WTA_TRANSCRIPTS_DIR 仅在新变量未设置时兼容；新变量设为空可禁用环境变量来源。
safe 仅表示可以进一步评估回收，不表示已经获得删除授权。`;

export function parseOptions(argv) {
  const result = { base: "", withPr: false, transcripts: process.env.SKILLS_HUB_TRANSCRIPTS_DIR ?? process.env.SKILLS_WTA_TRANSCRIPTS_DIR ?? "", repo: null, help: false };
  const args = [...argv];
  while (args.length) {
    const option = args.shift();
    if (option === "--") { if (args.length > 1) throw new Error("只接受一个仓库路径"); result.repo = args[0] ?? null; break; }
    if (option === "-h" || option === "--help") { result.help = true; break; }
    if (option === "--with-pr") { result.withPr = true; continue; }
    if (["-b", "--base", "--transcripts"].includes(option)) {
      if (!args.length) throw new Error(`${option} 需要一个值`);
      result[option === "--transcripts" ? "transcripts" : "base"] = args.shift();
      continue;
    }
    if (option.startsWith("-")) throw new Error(`未知选项：${option}`);
    result.repo = option;
    if (args.length) throw new Error("只接受一个仓库路径；选项应写在路径之前");
  }
  return result;
}

const environment = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };
function command(file, args, cwd) {
  return spawnSync(file, args, { cwd, env: environment, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}
function git(repo, ...args) { return command("git", ["-C", repo, ...args], repo); }
function output(result) { return result.status === 0 && !result.error ? result.stdout.trim() : null; }
const display = (value) => value.replace(/\t/g, "\\t").replace(/\r/g, "\\r").replace(/\n/g, "\\n");

function treeBytes(directory) {
  let total = 0;
  const seen = new Set();
  function visit(file) {
    const stats = fs.lstatSync(file);
    const identity = `${stats.dev}:${stats.ino}`;
    if (stats.ino && seen.has(identity)) return;
    if (stats.ino) seen.add(identity);
    total += Number.isFinite(stats.blocks) ? stats.blocks * 512 : stats.size;
    if (stats.isDirectory()) for (const entry of fs.readdirSync(file)) visit(path.join(file, entry));
  }
  try { visit(directory); return total; } catch { return null; }
}
function humanBytes(bytes) {
  if (bytes === null) return "?";
  const units = ["B", "K", "M", "G", "T", "P"];
  let value = bytes; let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)}${units[unit]}`;
}

function transcriptFiles(directory) {
  const files = [];
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  visit(directory);
  return files;
}
function lastConversation(files, worktree, sourceRoots) {
  let timestamp = 0;
  if (!files.length) return timestamp;
  const aliases = [worktree];
  for (const realpath of [fs.realpathSync, fs.realpathSync.native]) {
    try { aliases.push(realpath(worktree)); } catch { /* 仍可按 Git 原始路径查找。 */ }
  }
  // Git 可返回长目录名，而显式仓库或记录目录仍使用短目录名、目录联接等别名。
  // 沿这些已知来源目录重建路径，并核对同一目录身份后才纳入匹配；不枚举其他历史目录。
  for (const root of sourceRoots) {
    try {
      const relative = path.relative(fs.realpathSync.native(root), fs.realpathSync.native(worktree));
      const candidate = path.resolve(root, relative);
      const expected = fs.statSync(worktree, { bigint: true });
      const actual = fs.statSync(candidate, { bigint: true });
      if (actual.isDirectory() && actual.ino !== 0n && actual.dev === expected.dev && actual.ino === expected.ino) aliases.push(candidate);
    } catch { /* 无法证明是同一目录的候选不会扩展匹配范围。 */ }
  }
  const windows = process.platform === "win32";
  const comparable = (value) => windows ? value.toLowerCase() : value;
  const paths = [...new Set(aliases.flatMap((value) => {
    const native = windows ? value.replace(/\//g, "\\") : value;
    return [value, native, native.replace(/\\/g, "/"), native.replace(/\\/g, "\\\\")].map(comparable);
  }))];
  for (const file of files) {
    const data = fs.readFileSync(file);
    if (data.includes(0)) continue;
    const text = comparable(data.toString("utf8"));
    if (paths.some((value) => [`${value}/`, `${value}\\`, `${value}"`].some((prefix) => text.includes(prefix))))
      timestamp = Math.max(timestamp, fs.statSync(file).mtimeMs);
  }
  return timestamp;
}

function readPullRequests(repo) {
  for (const [file, fields, state, head] of [["origin", "number,status,headRef", "status", "headRef"], ["gh", "number,state,headRefName", "state", "headRefName"]]) {
    const result = command(file, ["pr", "list", "--author", "@me", "--state", "all", "--limit", "1000", "--json", fields], repo);
    if (result.status !== 0 || result.error) continue;
    try {
      const values = JSON.parse(result.stdout);
      if (!Array.isArray(values)) continue;
      if (values.some((item) => !Number.isSafeInteger(item.number) || typeof item[state] !== "string" || typeof item[head] !== "string")) continue;
      return values.map((item) => ({ number: item.number, state: item[state].toLowerCase(), head: item[head] }));
    } catch { /* 尝试另一个实际可用的只读 CLI。 */ }
  }
  console.error("警告：无法读取 PR 状态；只报告本地证据");
  return [];
}

export function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseOptions(argv); }
  catch (error) { console.error(`错误：${error.message}`); return 2; }
  if (options.help) { console.log(USAGE); return 0; }
  try {
    const repo = options.repo ? fs.realpathSync(options.repo) : output(command("git", ["rev-parse", "--show-toplevel"], process.cwd()));
    if (!repo || output(git(repo, "rev-parse", "--git-dir")) === null) throw new Error("当前不在 Git 仓库中；请传入有效仓库路径");
    const sourceRoots = [options.repo ? path.resolve(options.repo) : process.cwd()];
    let transcripts = [];
    if (options.transcripts) {
      try {
        const folder = fs.realpathSync(options.transcripts);
        if (!fs.statSync(folder).isDirectory()) throw new Error("对话路径必须是明确指定的目录");
        transcripts = transcriptFiles(folder);
        sourceRoots.push(path.resolve(options.transcripts));
      } catch (error) { console.error(`错误：无法读取指定对话目录：${error.message}`); return 2; }
    }
    const listed = git(repo, "worktree", "list", "--porcelain", "-z");
    if (listed.status !== 0 || listed.error) throw new Error("无法读取工作树；Git 必须支持 worktree list --porcelain -z");
    const worktrees = listed.stdout.split("\0").filter((field) => field.startsWith("worktree ")).map((field) => field.slice(9));
    if (!worktrees.length) throw new Error("无法读取主工作树");
    let base = options.base;
    if (!base) {
      const candidates = [output(git(repo, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")), "origin/main", "origin/master"];
      base = candidates.find((ref) => ref && output(git(repo, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`)));
      if (!base) throw new Error("没有基础引用；请传入 -b <ref>");
      console.error(`警告：未指定 -b；MERGED 对照本地 ${base} 检查`);
    }
    const baseCommit = output(git(repo, "rev-parse", "--verify", "--end-of-options", `${base}^{commit}`));
    if (!baseCommit) throw new Error(`找不到本地基础引用：${base}`);
    if (base.startsWith("origin/")) console.error(`说明：使用本地 ${base}，未抓取远程；数据可能过期`);
    const prs = options.withPr ? readPullRequests(repo) : [];
    const now = Date.now();
    const rows = [];
    for (const worktree of worktrees.slice(1)) {
      if (output(git(worktree, "rev-parse", "--git-dir")) === null) {
        rows.push({ bytes: null, cells: ["?", "?", "unknown", "unknown", "unknown", "-", "-", "review", display(worktree)] });
        continue;
      }
      const bytes = treeBytes(worktree);
      const head = output(git(worktree, "rev-parse", "HEAD"));
      const timestamp = Number(output(git(worktree, "log", "-1", "--format=%ct", "HEAD")));
      const age = timestamp > 0 ? `${Math.floor((now / 1000 - timestamp) / 86400)}d` : "?";
      const merged = head && git(repo, "merge-base", "--is-ancestor", head, baseCommit).status === 0 ? "YES" : "no";
      const status = git(worktree, "status", "--porcelain", "-z");
      let dirty = "unknown";
      if (status.status === 0 && !status.error) {
        const fields = status.stdout.split("\0"); let tracked = 0; let untracked = 0;
        for (let i = 0; i < fields.length; i += 1) {
          if (!fields[i]) continue;
          const code = fields[i].slice(0, 2);
          if (code === "??") untracked += 1;
          else { tracked += 1; if (/[RC]/.test(code)) i += 1; }
        }
        dirty = tracked ? `wip:${tracked}` : untracked ? `scratch:${untracked}` : "clean";
      }
      const branch = output(git(worktree, "symbolic-ref", "--quiet", "--short", "HEAD"));
      let remote = "detached";
      if (branch) {
        const reference = `refs/remotes/origin/${branch}`;
        const remoteHead = output(git(worktree, "rev-parse", "--verify", "--end-of-options", reference));
        remote = remoteHead ? remoteHead === head ? "pushed" : `ahead${output(git(worktree, "rev-list", "--count", `${remoteHead}..HEAD`)) ?? "?"}` : "no-remote";
      }
      const pr = branch ? prs.find((item) => item.head === branch) : null;
      const prText = pr ? `#${pr.number}/${pr.state}` : "-";
      const last = lastConversation(transcripts, worktree, sourceRoots);
      const recent = last > 0 && Math.floor((now - last) / 86400000) <= 4;
      let bucket = "review";
      if (dirty.startsWith("wip:") || dirty === "unknown") bucket = "hold-wip";
      else if (pr && ["open", "draft"].includes(pr.state)) bucket = "hold-open-pr";
      else if (recent) bucket = "verify-recent-chat";
      else if (merged === "YES" || pr?.state === "merged") bucket = "safe";
      rows.push({ bytes, cells: [humanBytes(bytes), age, merged, dirty, remote, prText, last ? new Date(last).toISOString().slice(0, 10) : "-", bucket, display(worktree)] });
    }
    console.log(`# base: ${display(base)}`);
    console.log("SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE");
    rows.sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1));
    for (const row of rows) console.log(row.cells.join("\t"));
    return 0;
  } catch (error) { console.error(`错误：${error.message}`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
