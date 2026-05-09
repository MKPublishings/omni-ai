import assert from 'node:assert/strict';
import test from 'node:test';

import { ComfyUIClient } from '../../image-gen/backend/gateway/ComfyUIClient.ts';

function createJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

test('ComfyUI client reports the submitted checkpoint as the loaded model', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/prompt') && init?.method === 'POST') {
      return createJsonResponse({ prompt_id: 'prompt-1' });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();
    await client.submitWorkflow({
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {
          ckpt_name: 'noobai-xl-vpred-v1.0',
        },
      },
    });

    assert.equal(await client.getLoadedModel(), 'noobai-xl-vpred-v1.0');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client marks the gateway unhealthy when object info is unavailable', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/queue')) {
      return createJsonResponse({ queue_running: [], queue_pending: [] });
    }
    if (url.endsWith('/object_info')) {
      return new Response('not-found', { status: 404 });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();
    assert.equal(await client.isHealthy(), false);
    assert.match(String(client.getLastHealthFailure() || ''), /ComfyUI request failed \(404\) for \/object_info\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client tolerates 403 on read-only queue probe when history is available', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/queue')) {
      return new Response('forbidden', { status: 403 });
    }
    if (url.includes('/history/')) {
      return createJsonResponse({
        'prompt-1': {
          status: {
            completed: true,
            status_str: 'success',
          },
        },
      });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();
    const status = await client.getJobStatus('prompt-1');

    assert.equal(status.status, 'completed');
    assert.equal(status.queuePosition, -1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client distinguishes running versus pending queue positions', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/queue')) {
      return createJsonResponse({
        queue_running: [[0, 'prompt-running']],
        queue_pending: [[1, 'prompt-pending']],
      });
    }
    if (url.includes('/history/')) {
      return createJsonResponse({});
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();
    const running = await client.getJobStatus('prompt-running');
    const pending = await client.getJobStatus('prompt-pending');

    assert.equal(running.status, 'processing');
    assert.equal(running.step, 1);
    assert.equal(running.queuePosition, 0);
    assert.equal(pending.status, 'processing');
    assert.equal(pending.step, 0);
    assert.equal(pending.queuePosition, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});