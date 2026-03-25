/**
 * 解析模板字符串，替换 {{variable}} 为上下文中的值
 * @param template - 包含 {{var}} 占位符的模板字符串
 * @param context - 变量名到值的映射
 * @returns 替换后的字符串
 */
export function parseTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return trimmedKey in context ? context[trimmedKey] : match;
  });
}
