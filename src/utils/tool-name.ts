import type { ToolEntry } from '../config/schema.js';

export function normalizeToolName(name: string): string {
  return name.trim().toLowerCase();
}

export function findToolByName(
  tools: readonly ToolEntry[],
  name: string,
  excludeId?: string,
): ToolEntry | undefined {
  const normalized = normalizeToolName(name);
  return tools.find((tool) =>
    tool.id !== excludeId && normalizeToolName(tool.name) === normalized,
  );
}

export function hasToolName(
  tools: readonly ToolEntry[],
  name: string,
  excludeId?: string,
): boolean {
  return findToolByName(tools, name, excludeId) !== undefined;
}
