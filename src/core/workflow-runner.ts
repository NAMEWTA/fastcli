import { select } from '@inquirer/prompts';
import { logger } from '../utils/logger.js';
import { parseTemplate } from './template-engine.js';
import { executeCommand } from './executor.js';
import {
  resolveProviderId,
  getProvider,
  getCredentialValues,
  resolveModeArgs,
  buildProviderCommand,
  buildInjectedEnv,
} from './provider-runtime.js';
import type { Workflow, WorkflowStep, WorkflowContext, Config } from '../types/index.js';

export interface WorkflowRuntime {
  config?: Config;
}

/**
 * 根据 ID 查找步骤
 */
export function findStepById(workflow: Workflow, id: string): WorkflowStep | undefined {
  return workflow.steps.find((s) => s.id === id);
}

/**
 * 构建最终命令（替换变量）
 */
export function buildFinalCommand(
  command: string,
  context: Record<string, string>
): string {
  return parseTemplate(command, context);
}

export function decideFinalCommand(
  optionCommand?: string,
  providerCommand?: string
): string | undefined {
  return optionCommand ?? providerCommand;
}

export function resolveCredentialId(
  selectedValue: string | undefined,
  contextValues: Record<string, string>
): string | undefined {
  return selectedValue ?? contextValues['select-account'];
}

function resolveExecutionMode(contextValues: Record<string, string>): string | undefined {
  return contextValues['select-mode'] ?? contextValues.mode;
}

/**
 * 计算从某步骤开始的最短路径长度（用于进度显示）
 */
export function calculateTotalSteps(workflow: Workflow, startId: string): number {
  const visited = new Set<string>();
  let minSteps = Infinity;

  function traverse(stepId: string, depth: number): void {
    if (visited.has(stepId)) return;
    visited.add(stepId);

    const step = findStepById(workflow, stepId);
    if (!step) return;

    for (const option of step.options) {
      if (option.command) {
        minSteps = Math.min(minSteps, depth);
      } else if (option.next) {
        traverse(option.next, depth + 1);
      }
    }

    visited.delete(stepId);
  }

  traverse(startId, 1);
  return minSteps === Infinity ? workflow.steps.length : minSteps;
}

/**
 * 运行工作流
 */
export async function runWorkflow(
  workflow: Workflow,
  dryRun = false,
  runtime: WorkflowRuntime = {}
): Promise<void> {
  if (workflow.steps.length === 0) {
    logger.error('工作流没有步骤');
    return;
  }

  const context: WorkflowContext = { values: {} };
  let currentStep = workflow.steps[0];
  let stepIndex = 1;
  const estimatedTotal = calculateTotalSteps(workflow, currentStep.id);

  console.log();
  if (workflow.description) {
    logger.info(workflow.description);
  }

  while (true) {
    logger.step(stepIndex, estimatedTotal, currentStep.prompt);

    const choices = currentStep.options.map((opt, index) => ({
      name: `${index + 1}. ${opt.name}`,
      value: opt,
    }));

    try {
      const selected = await select({
        message: '请选择',
        choices,
      });

      // 记录选择的值
      const value = selected.value ?? selected.name;
      context.values[currentStep.id] = value;
      logger.choice(selected.name);

      let providerCommand: string | undefined;
      let injectedEnv: NodeJS.ProcessEnv | undefined;

      const providerId = resolveProviderId(selected.provider, workflow.provider);
      const shouldExecuteProvider = Boolean(providerId) && !selected.command && !selected.next;

      if (shouldExecuteProvider) {
        if (!runtime.config) {
          logger.error('缺少运行时配置，无法执行 provider 模式');
          return;
        }

        const provider = getProvider(runtime.config, providerId!);
        const credentialId = resolveCredentialId(selected.value, context.values);
        if (!credentialId) {
          logger.error('缺少 credentialId，请先选择账号或凭据');
          return;
        }

        const credentialValues = getCredentialValues(runtime.config, credentialId);
        const mode = resolveExecutionMode(context.values);
        const modeArgs = resolveModeArgs(provider, mode);

        providerCommand = buildProviderCommand(provider.command, modeArgs);
        injectedEnv = buildInjectedEnv(process.env, provider.envMapping, credentialValues);
      }

      const optionCommand = selected.command
        ? buildFinalCommand(selected.command, context.values)
        : undefined;
      const finalCommand = decideFinalCommand(optionCommand, providerCommand);

      // 如果可决策出最终命令，执行并结束
      if (finalCommand) {
        console.log();
        if (dryRun) {
          logger.preview(`将执行: ${finalCommand}`);
        } else {
          await executeCommand(finalCommand, {
            env: injectedEnv,
            interactive: Boolean(providerCommand),
          });
        }
        console.log();
        logger.success('工作流完成');
        return;
      }

      // 如果有 next，跳转到下一步
      if (selected.next) {
        const nextStep = findStepById(workflow, selected.next);
        if (!nextStep) {
          logger.error(`找不到步骤: ${selected.next}`);
          return;
        }
        currentStep = nextStep;
        stepIndex++;
        console.log();
      } else {
        // 既没有 command 也没有 next，工作流配置错误
        logger.error('工作流配置错误：选项缺少 command 或 next');
        return;
      }
    } catch {
      // 用户按 Ctrl+C 退出
      console.log();
      logger.warn('已取消');
      return;
    }
  }
}
