import type { Config, ResolveResult } from '../types/index.js';

/**
 * 解析名称，判断是别名还是工作流
 * @param name - 用户输入的名称
 * @param config - 配置对象
 * @returns 解析结果，不存在返回 null
 */
export function resolveName(name: string, config: Config): ResolveResult | null {
  if (name in config.aliases) {
    return { type: 'alias', data: config.aliases[name] };
  }

  if (name in config.workflows) {
    return { type: 'workflow', data: config.workflows[name] };
  }

  return null;
}

/**
 * 检查名称是否可用（未被 alias 或 workflow 占用）
 * @param name - 要检查的名称
 * @param config - 配置对象
 */
export function isNameAvailable(name: string, config: Config): boolean {
  return !(name in config.aliases) && !(name in config.workflows);
}

/**
 * 获取所有已使用的名称
 * @param config - 配置对象
 */
export function getAllNames(config: Config): string[] {
  return [...Object.keys(config.aliases), ...Object.keys(config.workflows)];
}

/**
 * 查找相似名称（用于错误提示）
 * @param name - 用户输入的名称
 * @param config - 配置对象
 */
export function findSimilarNames(name: string, config: Config): string[] {
  const allNames = getAllNames(config);
  return allNames.filter(
    (n) => n.includes(name) || name.includes(n) || levenshteinDistance(n, name) <= 2
  );
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
