import { chmod, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { platform } from 'node:os';

import { getConfigDir } from './paths.js';

/**
 * 把任意可序列化对象以「原子写 + 严格权限」流程写到目标路径。
 *
 * 流程严格按下列顺序执行，任一步失败都会尽力清理临时文件后重新抛出
 * 原始错误，从而保证目标文件不会处于半写入状态：
 *
 * 1. `mkdir -p <configDir>`，`mode = 0o700`，`recursive: true` 让本步骤
 *    幂等且自动创建中间目录（PRD §7.4 / Requirement 4.4）
 * 2. 将值序列化为 `JSON.stringify(value, null, 2) + '\n'`，固定使用
 *    UTF-8 编码（与 reader 保持对称）
 * 3. 在与目标同目录下选择一个临时文件名
 *    `<target>.tmp-<pid>-<timestamp>`：同目录可保证 POSIX 上的 `rename`
 *    是原子的（不跨文件系统），并且文件名足够独特避免并发冲突
 * 4. `writeFile(tempPath, content, 'utf8')`
 * 5. 设置临时文件权限为 `0o600`：
 *    - POSIX 平台（`process.platform !== 'win32'`）：`chmod` 失败必须抛
 *      错（Requirement 7.4 要求文件最终权限为 `0o600`）
 *    - Windows 平台：`chmod` 在 NTFS 上语义有限，若调用失败则静默忽略
 * 6. `rename(tempPath, target)`：在 POSIX 同文件系统下是原子的，从而保证
 *    其他读者要么看到旧文件、要么看到新文件，绝不会看到半写入的内容
 *
 * 错误处理：除「Windows 上的 chmod」之外，任何一步抛错都会先尝试 `unlink`
 * 临时文件（吞掉清理时的 `ENOENT` 等次级错误），再向上抛出原始错误。
 *
 * @param targetPath 目标文件的绝对路径（如 `~/.fastcli/config.json`）。
 * @param value 任意 JSON 可序列化对象。
 */
export async function atomicWriteJson(
  targetPath: string,
  value: unknown,
): Promise<void> {
  // 1. 确保目录存在，权限 0o700。
  //    `recursive: true` 让 mkdir 在目录已存在时直接成功（不修改既有权限），
  //    在多层路径不存在时一次性补齐中间目录。
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true, mode: 0o700 });

  // 2. 序列化内容（末尾保留换行，便于 `cat` 等工具显示）。
  const content = `${JSON.stringify(value, null, 2)}\n`;

  // 3. 同目录下的唯一临时文件名（同目录是 POSIX 原子 rename 的前提）。
  const tempPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    // 4. 写入临时文件。
    await writeFile(tempPath, content, 'utf8');

    // 5. 设置严格权限。
    if (platform() === 'win32') {
      // Windows 上 NTFS 没有 POSIX 模式位语义,chmod 调用允许静默失败。
      try {
        await chmod(tempPath, 0o600);
      } catch {
        // 故意吞掉:Windows 平台上权限设置不是硬性约束。
      }
    } else {
      // POSIX 平台:chmod 失败视为致命错误,让原始错误向上传播。
      await chmod(tempPath, 0o600);
    }

    // 6. 原子 rename。
    await rename(tempPath, targetPath);
  } catch (err) {
    // 任一步骤失败:尽力清理临时文件,避免遗留垃圾。
    // 清理本身的错误(例如临时文件未被创建出来)不应掩盖原始错误。
    try {
      await unlink(tempPath);
    } catch {
      // 故意忽略:临时文件可能还没创建,或已被 rename 移走。
    }
    throw err;
  }
}
