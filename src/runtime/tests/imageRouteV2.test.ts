import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../../index.ts';

class MemoryNamespace {
  store = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (type === 'json') return JSON.parse(value);
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function createExecutionContext(): { waitUntil: (promise: Promise<unknown>) => void; passThroughOnException: () => void } {
  return {
    waitUntil(_promise: Promise<unknown>) {
      void _promise;
    },
    passThroughOnException() {
      return;
    },
  };
}

test('worker /api/image v2 branch preserves image response contract', async () => {
  const consoleMessages: string[] = [];
  const originalConsoleInfo = console.info;
  console.info = (...args: unknown[]) => {
    consoleMessages.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_PIPELINE_V2: '1',
    COMFYUI_MOCK: 'true',
    DEFAULT_CHECKPOINT: 'noobai-xl-vpred-v1.0',
  } as any;

  const request = new Request('https://example.test/api/image?pipeline=v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
      debug: true,
    }),
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const body = await response.json() as Record<string, any>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Model'), 'noobai-xl-vpred-v1.0');
  assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v2');
  assert.match(String(body.imageDataUrl || ''), /^data:image\/png;base64,/);
  assert.match(String(body.filename || ''), /^ionirix_lofi_aesthetic_/);
  assert.equal(body.user_id, 'usr_test');
  assert.equal(body.metadata?.pipeline?.version, 'v2');
  assert.equal(body.metadata?.pipeline?.gateway, 'mock');
  assert.equal(body.metadata?.pipeline?.promptId?.startsWith('mock-'), true);
  assert.ok(Array.isArray(body.metadata?.pipeline?.reasoningChain));
  assert.equal(body.metadata?.request?.styleFamily, 'lofi_aesthetic');
  assert.equal(body.metadata?.request?.styleSource, 'session-or-request');
  assert.equal(body.metadata?.image?.resolution, '1536x1024');
  assert.equal(body.metadata?.image?.format, 'png');
  assert.equal(body.metadata?.model?.outputModel, 'noobai-xl-vpred-v1.0');
  assert.equal(body.metadata?.model?.seed, 42);
  assert.equal(body.metadata?.postProcessing?.outputFormat, 'png');
  assert.equal(body.metadata?.postProcessing?.metadataEmbedded, true);
  assert.equal(body.metadata?.postProcessing?.thumbnailGenerated, true);
  assert.equal(typeof body.metadata?.promptAnalytics?.originalPromptLength, 'number');
  assert.equal(typeof body.metadata?.promptAnalytics?.positivePromptLength, 'number');
  assert.match(String(body.metadata?.prompt?.positive || ''), /lo-fi|cozy|warm lighting/i);
  assert.equal(body.metadata?.scene?.materials?.source, 'none');
  assert.equal(body.metadata?.style_id, undefined);
  assert.equal(body.metadata?.pipeline_version, undefined);
  assert.equal(body.debug?.v2_pipeline?.gateway, 'mock');

  const imageLog = consoleMessages.find((message) => message.startsWith('[ION IMAGE] '));
  assert.ok(imageLog);
  assert.match(String(imageLog || ''), /"event":"ion.image.job.completed"/);
  assert.match(String(imageLog || ''), /"jobId":"sync-/);
  assert.match(String(imageLog || ''), /"gateway":"mock"/);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image returns provider failure when env-flagged v2 pipeline is unavailable', async () => {
  const consoleMessages: string[] = [];
  const originalConsoleInfo = console.info;
  console.info = (...args: unknown[]) => {
    consoleMessages.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_PIPELINE_V2: '1',
    COMFYUI_MOCK: 'false',
    COMFYUI_HOST: 'http://127.0.0.1:1',
    COMFYUI_REQUEST_TIMEOUT_MS: '25',
    MODEL_IMAGE: '@cf/black-forest-labs/flux-1-schnell',
  } as any;

  const request = new Request('https://example.test/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
      debug: true,
    }),
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const body = await response.json() as Record<string, any>;

  assert.ok(response.status === 503 || response.status === 504, `expected provider failure status, got ${response.status}`);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Model'), null);
  assert.equal(response.headers.get('X-ION-Image-Route'), null);
  assert.equal(response.headers.get('X-ION-Image-Fallback'), null);
  assert.equal(response.headers.get('X-ION-Image-Fallback-Reason'), null);
  assert.match(String(body.code || ''), /provider-unavailable|provider-timeout|image-generation-failed/);
  assert.equal(typeof body.error, 'string');
  assert.equal(body.imageDataUrl, undefined);

  const fallbackLog = consoleMessages.find((message) => message.includes('"event":"ion.image.route.fallback"'));
  assert.equal(fallbackLog, undefined);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image ignores deprecated legacy fallback flags and still returns provider failure', async () => {
  const consoleMessages: string[] = [];
  const originalConsoleInfo = console.info;
  console.info = (...args: unknown[]) => {
    consoleMessages.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();

  const env = {
    AI: {
      run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_PIPELINE_V2: '1',
    COMFYUI_MOCK: 'false',
    COMFYUI_HOST: 'http://127.0.0.1:1',
    COMFYUI_REQUEST_TIMEOUT_MS: '25',
    MODEL_IMAGE: '@cf/black-forest-labs/flux-1-schnell',
  } as any;

  const request = new Request('https://example.test/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: 'usr_test',
      prompt: 'Draw a cozy girl studying by the window with warm evening light.',
      stylePack: 'lofi',
      width: 1536,
      height: 1024,
      seed: 42,
      debug: true,
    }),
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const body = await response.json() as Record<string, any>;

  assert.ok(response.status === 503 || response.status === 504, `expected provider failure status, got ${response.status}`);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Model'), null);
  assert.equal(response.headers.get('X-ION-Image-Route'), null);
  assert.equal(response.headers.get('X-ION-Image-Fallback'), null);
  assert.equal(response.headers.get('X-ION-Image-Fallback-Reason'), null);
  assert.match(String(body.code || ''), /provider-unavailable|provider-timeout|image-generation-failed/);
  assert.equal(typeof body.error, 'string');
  assert.equal(body.imageDataUrl, undefined);

  const fallbackLog = consoleMessages.find((message) => message.includes('"event":"ion.image.route.fallback"'));
  assert.equal(fallbackLog, undefined);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image falls back to direct AI generation when ComfyUI prompt endpoint returns 403', async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/queue') && init?.method === 'GET') {
      return new Response(JSON.stringify({ queue_running: [], queue_pending: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith('/object_info') && init?.method === 'GET') {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith('/prompt') && init?.method === 'POST') {
      return new Response('forbidden', { status: 403 });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const env = {
      AI: {
        run: async () => ({ image: new Uint8Array([137, 80, 78, 71]) }),
      },
      MEMORY: memory as any,
      MIND: mind as any,
      ASSETS: {
        fetch: async () => new Response('not-found', { status: 404 }),
      },
      ION_IMAGE_PIPELINE_V2: '1',
      COMFYUI_MOCK: 'false',
      COMFYUI_HOST: 'http://localhost:8188',
      MODEL_IMAGE: '@cf/black-forest-labs/flux-1-schnell',
    } as any;

    const request = new Request('https://example.test/api/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'usr_test',
        prompt: 'Photorealistic portrait of an astronaut in a greenhouse, vertical 9:16, high detail',
        width: 1024,
        height: 1024,
      }),
    });

    const response = await worker.fetch(request, env, createExecutionContext() as any);
    const body = await response.json() as Record<string, any>;

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v2');
    assert.equal(response.headers.get('X-ION-Image-Model'), '@cf/black-forest-labs/flux-1-schnell');
    assert.equal(typeof body.imageDataUrl, 'string');
    assert.match(String(body.imageDataUrl || ''), /^data:image\/png;base64,/);
    assert.equal(body.metadata?.pipeline?.gateway, 'ai-direct-fallback');
    assert.equal(body.metadata?.request?.originalPrompt?.length > 0, true);
    assert.equal(body.metadata?.prompt?.positive?.length > 0, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
