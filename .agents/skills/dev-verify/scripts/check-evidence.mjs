#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function entries(directory, optional = false) {
  const stat = fs.lstatSync(directory, { throwIfNoEntry: false });
  if (!stat && optional) return [];
  if (!stat?.isDirectory()) throw new Error(`需要普通目录：${directory}`);
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export function checkEvidence(change) {
  const tasks = entries(path.join(change, 'tasks'));
  const reports = entries(path.join(change, 'evidences'), true);
  const expected = new Set();
  const problems = [];
  for (const task of tasks) {
    if (path.extname(task.name) !== '.md') continue;
    if (task.isFile()) expected.add(task.name);
    else problems.push(`任务必须是普通文件：tasks/${task.name}`);
  }
  const matched = new Set();
  for (const report of reports) {
    if (!report.isFile() || path.extname(report.name) !== '.md') {
      problems.push(`报告目录只允许普通 .md 文件：evidences/${report.name}`);
    } else if (!expected.has(report.name)) {
      problems.push(`无完全同名的任务：evidences/${report.name}`);
    } else matched.add(report.name);
  }
  for (const name of expected) if (!matched.has(name)) problems.push(`缺少报告：evidences/${name}`);
  return { count: expected.size, problems };
}

export function main(args = process.argv.slice(2)) {
  const usage = '用法：node check-evidence.mjs CHANGE目录';
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return 0; }
  if (args.length !== 1 || !args[0] || args[0].startsWith('--')) { console.error(usage); return 2; }
  try {
    const { count, problems } = checkEvidence(path.resolve(args[0]));
    if (problems.length) {
      for (const problem of problems) console.error(problem);
      return 1;
    }
    console.log(`任务与验收报告一一对应：${count} 对。仅检查文件，不代表通过验收。`);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) process.exitCode = main();
