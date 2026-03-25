/**
 * 配置文件根结构
 */
export interface Config {
  aliases: Record<string, Alias>;
  workflows: Record<string, Workflow>;
}

/**
 * 命令别名
 */
export interface Alias {
  command: string;
  description?: string;
}

/**
 * 工作流定义
 */
export interface Workflow {
  description?: string;
  steps: WorkflowStep[];
}

/**
 * 工作流步骤
 */
export interface WorkflowStep {
  id: string;
  prompt: string;
  options: WorkflowOption[];
}

/**
 * 工作流选项
 */
export interface WorkflowOption {
  name: string;
  value?: string;
  next?: string;
  command?: string;
}

/**
 * 工作流运行时上下文
 */
export interface WorkflowContext {
  values: Record<string, string>;
}

/**
 * 名称解析结果
 */
export type ResolveResult =
  | { type: 'alias'; data: Alias }
  | { type: 'workflow'; data: Workflow };

/**
 * 命令执行结果
 */
export interface ExecResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * 配置校验结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 默认空配置
 */
export const DEFAULT_CONFIG: Config = {
  aliases: {},
  workflows: {},
};
