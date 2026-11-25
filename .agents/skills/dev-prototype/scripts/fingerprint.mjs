import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const usage = '用法：node fingerprint.mjs <原型目录> [--expect <64 位 SHA-256>]';
const sha256 = content => createHash('sha256').update(content).digest('hex');
const displayPath = relative => JSON.stringify(relative || '.');

/** 只读计算整个原型资源包的内容指纹；不验证页面行为或用户确认。 */
export async function fingerprint(directory) {
  if (typeof directory !== 'string' || directory.trim() === '') {
    throw new Error('请提供原型目录。');
  }

  const root = path.resolve(directory);
  const files = [];

  async function visit(absolute, relative = '') {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      throw new Error(`不支持符号链接：${displayPath(relative)}`);
    }
    if (relative === '' && !stat.isDirectory()) {
      throw new Error('原型目标必须是目录。');
    }
    if (stat.isDirectory()) {
      const names = await readdir(absolute);
      if (names.length === 0) {
        throw new Error(`不支持空目录：${displayPath(relative)}`);
      }
      for (const name of names) {
        await visit(path.join(absolute, name), relative ? `${relative}/${name}` : name);
      }
      return;
    }
    if (!stat.isFile()) {
      throw new Error(`不支持特殊文件：${displayPath(relative)}；仅接受普通文件和目录。`);
    }
    files.push({ path: relative, sha256: sha256(await readFile(absolute)) });
  }

  await visit(root);
  if (!files.some(file => /\.html?$/i.test(file.path))) {
    throw new Error('原型资源包至少需要一个 .html 或 .htm 入口文件，文件名不必为 index.html。');
  }

  // 不依赖文件系统遍历顺序、区域设置、目录位置或修改时间。
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  // JSON 编码避免路径中的换行、引号等字符造成序列歧义；版本前缀固定摘要格式。
  const manifest = JSON.stringify(files.map(file => [file.path, file.sha256]));
  return { sha256: sha256(`dev-prototype-fingerprint-v1\0${manifest}`), files };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    console.log(usage);
    console.log('递归读取所有资源。需要 HTML 入口，不接受符号链接、特殊文件或空目录。');
    return 0;
  }

  try {
    if (![1, 3].includes(argv.length) || !argv[0] || argv[0].startsWith('-')) {
      throw new Error(usage);
    }
    let expected;
    if (argv.length === 3) {
      if (argv[1] !== '--expect' || !/^[\da-f]{64}$/i.test(argv[2])) {
        throw new Error(`--expect 需要完整的 64 位十六进制 SHA-256。\n${usage}`);
      }
      expected = argv[2].toLowerCase();
    }

    const result = await fingerprint(argv[0]);
    console.log(`原型资源包 SHA-256：${result.sha256}`);
    console.log(`文件数量：${result.files.length}`);
    for (const file of result.files) console.log(`${file.sha256}  ${JSON.stringify(file.path)}`);
    console.log('此指纹仅标识文件内容，不代表用户确认或交互验证通过。');
    if (expected && result.sha256 !== expected) {
      throw new Error(`指纹不匹配：预期 ${expected}，实际 ${result.sha256}。`);
    }
    if (expected) console.log('指纹匹配。');
    return 0;
  } catch (error) {
    console.error(`无法核对原型指纹：${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
