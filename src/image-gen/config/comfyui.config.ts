import { readImageGenEnvironment } from './env';

export interface ComfyUIConnectionConfig {
  host: string;
  wsUrl: string;
  mock: boolean;
  requestTimeoutMs: number;
  promptPath: string;
  viewPath: string;
  queuePath: string;
  objectInfoPath: string;
  interruptPath: string;
  historyPath: (promptId: string) => string;
}

export function resolveComfyUIConfig(source?: Record<string, unknown>): ComfyUIConnectionConfig {
  const env = readImageGenEnvironment(source);

  return {
    host: env.comfyuiFetchHost.replace(/\/+$/, ''),
    wsUrl: env.comfyuiWs,
    mock: env.comfyuiMock,
    requestTimeoutMs: env.comfyuiRequestTimeoutMs,
    promptPath: '/prompt',
    viewPath: '/view',
    queuePath: '/queue',
    objectInfoPath: '/object_info',
    interruptPath: '/interrupt',
    historyPath: (promptId: string) => `/history/${encodeURIComponent(promptId)}`,
  };
}