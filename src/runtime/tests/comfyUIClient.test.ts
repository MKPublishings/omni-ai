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
          ckpt_name: 'v1-5-pruned-emaonly-fp16.safetensors',
        },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'positive prompt',
          clip: ['1', 1],
        },
      },
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'negative prompt',
          clip: ['1', 1],
        },
      },
      '4': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: 512,
          height: 512,
          batch_size: 1,
        },
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          seed: 1,
          steps: 20,
          cfg: 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0],
        },
      },
      '6': {
        class_type: 'VAEDecode',
        inputs: {
          samples: ['5', 0],
          vae: ['1', 2],
        },
      },
      '7': {
        class_type: 'SaveImage',
        inputs: {
          filename_prefix: 'test',
          images: ['6', 0],
        },
      },
    });

    assert.equal(await client.getLoadedModel(), 'v1-5-pruned-emaonly-fp16.safetensors');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client treats object info endpoint as optional when queue is healthy', async () => {
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
    assert.equal(await client.isHealthy(), true);
    assert.equal(client.getLastHealthFailure(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client marks the gateway unhealthy when queue endpoint is unavailable', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/queue')) {
      return new Response('service unavailable', { status: 503 });
    }
    if (url.endsWith('/object_info')) {
      return createJsonResponse({});
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();
    assert.equal(await client.isHealthy(), false);
    assert.match(String(client.getLastHealthFailure() || ''), /ComfyUI request failed \(503\) for \/queue\./);
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

test('ComfyUI client auto-reconciles unsupported checkpoint names to available object_info values', async () => {
  const originalFetch = globalThis.fetch;
  let submittedCheckpoint = '';

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/object_info')) {
      return createJsonResponse({
        CheckpointLoaderSimple: {
          input: {
            required: {
              ckpt_name: [['v1-5-pruned-emaonly-fp16.safetensors']],
            },
          },
        },
      });
    }

    if (url.endsWith('/prompt') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body || '{}')) as {
        prompt?: Record<string, { inputs?: { ckpt_name?: string } }>;
      };
      submittedCheckpoint = String(body.prompt?.['1']?.inputs?.ckpt_name || '');
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
          ckpt_name: 'ion-citizen-xl-vpred-v2.0.safetensors',
        },
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'positive prompt',
          clip: ['1', 1],
        },
      },
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'negative prompt',
          clip: ['1', 1],
        },
      },
      '4': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: 512,
          height: 512,
          batch_size: 1,
        },
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          seed: 1,
          steps: 20,
          cfg: 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0],
        },
      },
      '6': {
        class_type: 'VAEDecode',
        inputs: {
          samples: ['5', 0],
          vae: ['1', 2],
        },
      },
      '7': {
        class_type: 'SaveImage',
        inputs: {
          filename_prefix: 'test',
          images: ['6', 0],
        },
      },
    });

    assert.equal(submittedCheckpoint, 'v1-5-pruned-emaonly-fp16.safetensors');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ComfyUI client surfaces empty checkpoint list diagnostics from prompt validation', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/prompt') && init?.method === 'POST') {
      return createJsonResponse({
        error: {
          type: 'prompt_outputs_failed_validation',
          message: 'Prompt outputs failed validation',
          details: '',
          extra_info: {},
        },
        node_errors: {
          '1': {
            errors: [
              {
                type: 'value_not_in_list',
                message: 'Value not in list',
                details: "ckpt_name: 'ion-citizen-xl-vpred-v2.0.safetensors' not in []",
                extra_info: {
                  input_name: 'ckpt_name',
                  input_config: [[], { tooltip: 'The name of the checkpoint (model) to load.' }],
                  received_value: 'ion-citizen-xl-vpred-v2.0.safetensors',
                },
              },
            ],
            dependent_outputs: ['7'],
            class_type: 'CheckpointLoaderSimple',
          },
        },
      }, 400);
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  };

  try {
    const client = new ComfyUIClient();

    await assert.rejects(
      () => client.submitWorkflow({
        '1': {
          class_type: 'CheckpointLoaderSimple',
          inputs: {
            ckpt_name: 'ion-citizen-xl-vpred-v2.0.safetensors',
          },
        },
        '2': {
          class_type: 'CLIPTextEncode',
          inputs: {
            text: 'positive prompt',
            clip: ['1', 1],
          },
        },
        '3': {
          class_type: 'CLIPTextEncode',
          inputs: {
            text: 'negative prompt',
            clip: ['1', 1],
          },
        },
        '4': {
          class_type: 'EmptyLatentImage',
          inputs: {
            width: 512,
            height: 512,
            batch_size: 1,
          },
        },
        '5': {
          class_type: 'KSampler',
          inputs: {
            seed: 1,
            steps: 20,
            cfg: 7,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 1,
            model: ['1', 0],
            positive: ['2', 0],
            negative: ['3', 0],
            latent_image: ['4', 0],
          },
        },
        '6': {
          class_type: 'VAEDecode',
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2],
          },
        },
        '7': {
          class_type: 'SaveImage',
          inputs: {
            filename_prefix: 'test',
            images: ['6', 0],
          },
        },
      }),
      /zero available checkpoints|model-discovery issue/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});