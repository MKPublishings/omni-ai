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

test('worker /api/image uses ion-native v3 contract by default', async () => {
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
    ION_MOCK: 'true',
    DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
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

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Model'), 'ion-native-renderer/vector-synth-v1');
  assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v3');
  assert.equal(response.headers.get('X-ION-Image-Provider'), 'ion-native');
  assert.match(String(body.imageDataUrl || ''), /^data:image\//);
  assert.match(String(body.filename || ''), /^ionirix_lofi_aesthetic_/);
  assert.equal(body.user_id, 'usr_test');
  assert.equal(body.metadata?.pipeline?.version, 'v2');
  assert.equal(body.metadata?.pipeline?.gateway, 'mock');
  assert.equal(body.metadata?.pipeline?.promptId?.startsWith('ion-native-'), true);
  assert.ok(Array.isArray(body.metadata?.pipeline?.reasoningChain));
  assert.equal(body.metadata?.request?.styleFamily, 'lofi_aesthetic');
  assert.equal(body.metadata?.request?.styleSource, 'session-or-request');
  assert.equal(body.metadata?.image?.resolution, '1536x1024');
  assert.equal(body.metadata?.image?.format, 'png');
  assert.equal(body.metadata?.model?.outputModel, 'ion-native-renderer/vector-synth-v1');
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
  assert.equal(body.debug, undefined);

  const imageLog = consoleMessages.find((message) => message.startsWith('[ION IMAGE] '));
  assert.ok(imageLog);
  assert.match(String(imageLog || ''), /"event":"ion.image.job.completed"/);
  assert.match(String(imageLog || ''), /"jobId":"sync-/);
  assert.match(String(imageLog || ''), /"gateway":"mock"/);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image remains available when ion is unreachable because ion-native is primary', async () => {
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
    ION_MOCK: 'false',
    ION_HOST: 'http://127.0.0.1:1',
    ION_REQUEST_TIMEOUT_MS: '25',
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

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v3');
  assert.equal(response.headers.get('X-ION-Image-Provider'), 'ion-native');
  assert.equal(body.metadata?.pipeline?.gateway, 'mock');
  assert.match(String(body.imageDataUrl || ''), /^data:image\//);

  const fallbackLog = consoleMessages.find((message) => message.includes('"event":"ion.image.route.fallback"'));
  assert.equal(fallbackLog, undefined);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image sends photogrammetry-enhanced prompts through cloudflare-ai fallback', async () => {
  const memory = new MemoryNamespace();
  const mind = new MemoryNamespace();
  const aiCalls: Array<Record<string, unknown>> = [];

  const env = {
    AI: {
      run: async (_model: string, input: Record<string, unknown>) => {
        aiCalls.push(input);
        return { image: new Uint8Array([137, 80, 78, 71]) };
      },
    },
    MEMORY: memory as any,
    MIND: mind as any,
    ASSETS: {
      fetch: async () => new Response('not-found', { status: 404 }),
    },
    ION_IMAGE_PIPELINE_V2: '1',
    ION_IMAGE_PROVIDER_PRIMARY: 'cloudflare-ai',
    ION_IMAGE_PROVIDER_FALLBACK: 'none',
    ION_IMAGE_FALLBACK_MODEL: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    DEFAULT_CHECKPOINT: 'ion-citizen-xl-vpred-v2.0',
  } as any;

  const request = new Request('https://example.test/api/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: 'usr_test',
      prompt: 'Photorealistic portrait of a person in natural light.',
      width: 1024,
      height: 1536,
      seed: 42,
    }),
  });

  const response = await worker.fetch(request, env, createExecutionContext() as any);
  const body = await response.json() as Record<string, any>;
  const cfRequest = aiCalls[0] || {};

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-ION-Image-Provider'), 'cloudflare-ai');
  assert.match(String(cfRequest.prompt || ''), /photogrammetry-grade scene reconstruction/i);
  assert.match(String(cfRequest.prompt || ''), /single clearly isolated subject/i);
  assert.match(String(cfRequest.negative_prompt || ''), /no overlapping anatomy/i);
  assert.match(String(cfRequest.negative_prompt || ''), /no hidden eyes/i);
  assert.equal(cfRequest.num_steps, 20);
  assert.equal(cfRequest.guidance, 7);
  assert.match(String(body.metadata?.prompt?.positive || ''), /photogrammetry-grade scene reconstruction/i);
});

test('worker /api/image ignores deprecated legacy fallback flags and still serves ion-native output', async () => {
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
    ION_MOCK: 'false',
    ION_HOST: 'http://127.0.0.1:1',
    ION_REQUEST_TIMEOUT_MS: '25',
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

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/json');
  assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v3');
  assert.equal(response.headers.get('X-ION-Image-Provider'), 'ion-native');
  assert.equal(body.metadata?.pipeline?.gateway, 'mock');
  assert.match(String(body.imageDataUrl || ''), /^data:image\//);

  const fallbackLog = consoleMessages.find((message) => message.includes('"event":"ion.image.route.fallback"'));
  assert.equal(fallbackLog, undefined);
  } finally {
    console.info = originalConsoleInfo;
  }
});

test('worker /api/image no longer depends on ion prompt endpoint for default path', async () => {
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
      ION_MOCK: 'false',
      ION_HOST: 'http://localhost:8188',
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
    assert.equal(response.headers.get('X-ION-Image-Route'), 'image-gen-v3');
    assert.equal(response.headers.get('X-ION-Image-Provider'), 'ion-native');
    assert.equal(response.headers.get('X-ION-Image-Model'), 'ion-native-renderer/vector-synth-v1');
    assert.match(String(body.imageDataUrl || ''), /^data:image\//);
    assert.equal(typeof body.metadata, 'object');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
