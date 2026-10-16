export interface ToolDefinition {
  id: string;
  name: string;
  npmPackage: string;
  executable: string;
  launchArgs: readonly string[];
  versionArgs: readonly string[];
  minimumNode?: string;
}

export interface ProcessInvocation {
  file: string;
  args: readonly string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface ProcessResult {
  code: number;
  signal?: NodeJS.Signals | null;
  error?: string;
  cleanupError?: string;
}

export interface ProbeResult extends ProcessResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface DetectedInstallation {
  path: string;
  realPath: string;
  source: string;
  isPathDefault: boolean;
  version?: string;
  error?: string;
}

export interface ToolDetection {
  tool: ToolDefinition;
  installations: DetectedInstallation[];
}
