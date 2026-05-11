import { readImageGenEnvironment } from './env';

export interface ionConnectionConfig {
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

export function resolveionConfig(source?: Record<string, unknown>): ionConnectionConfig {
  const env = readImageGenEnvironment(source);

  return {
    host: env.ionFetchHost.replace(/\/+$/, ''),
    wsUrl: env.ionWs,
    mock: env.ionMock,
    requestTimeoutMs: env.ionRequestTimeoutMs,
    promptPath: '/prompt',
    viewPath: '/view',
    queuePath: '/queue',
    objectInfoPath: '/object_info',
    interruptPath: '/interrupt',
    historyPath: (promptId: string) => `/history/${encodeURIComponent(promptId)}`,
  };
}