import type {
  ComfyUIWorkflow,
  IModelGateway,
  JobStatus,
  ProgressEvent,
} from '../../shared/types';
import { readImageGenEnvironment } from '../../config/env';

interface MockJobRecord {
  promptId: string;
  createdAt: number;
  totalSteps: number;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (let offset = 0; offset < bytes.length; offset += 1) {
    const byte = bytes[offset];
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;

  for (let offset = 0; offset < bytes.length; offset += 1) {
    const byte = bytes[offset];
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  writeUint32(chunk, 8 + data.length, crc32(crcInput));

  return chunk;
}

function createMockImagePng(width = 96, height = 96): Uint8Array {
  const scanlineLength = 1 + width * 3;
  const raw = new Uint8Array(scanlineLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * scanlineLength;
    raw[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 3;
      const blend = Math.floor((255 * (x + y)) / Math.max(1, width + height - 2));
      const stripe = ((x >> 4) + (y >> 4)) % 2 === 0;

      raw[pixelOffset] = stripe ? 20 : 8;
      raw[pixelOffset + 1] = stripe ? Math.max(60, blend) : Math.max(110, blend);
      raw[pixelOffset + 2] = stripe ? 96 : 210;
    }
  }

  const zlibBody = new Uint8Array(2 + 5 + raw.length + 4);
  zlibBody[0] = 0x78;
  zlibBody[1] = 0x01;
  zlibBody[2] = 0x01;
  zlibBody[3] = raw.length & 0xff;
  zlibBody[4] = (raw.length >>> 8) & 0xff;
  const nlen = (~raw.length) & 0xffff;
  zlibBody[5] = nlen & 0xff;
  zlibBody[6] = (nlen >>> 8) & 0xff;
  zlibBody.set(raw, 7);
  writeUint32(zlibBody, zlibBody.length - 4, adler32(raw));

  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', zlibBody),
    createChunk('IEND', new Uint8Array(0)),
  ];

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

const MOCK_IMAGE_BYTES = createMockImagePng();

export class MockComfyUIClient implements IModelGateway {
  private readonly jobs = new Map<string, MockJobRecord>();

  async submitWorkflow(_workflow: ComfyUIWorkflow): Promise<{ promptId: string }> {
    const promptId = `mock-${crypto.randomUUID()}`;

    this.jobs.set(promptId, {
      promptId,
      createdAt: Date.now(),
      totalSteps: readImageGenEnvironment().defaultSteps,
    });

    return { promptId };
  }

  async getJobStatus(promptId: string): Promise<JobStatus> {
    const job = this.getJob(promptId);
    const elapsedMs = Date.now() - job.createdAt;
    const completed = elapsedMs >= 100;

    return {
      promptId,
      status: completed ? 'completed' : 'processing',
      queuePosition: completed ? 0 : 1,
      step: completed ? job.totalSteps : Math.min(job.totalSteps - 1, Math.max(1, Math.floor(job.totalSteps / 2))),
      totalSteps: job.totalSteps,
    };
  }

  async getOutputImage(promptId: string): Promise<Uint8Array> {
    this.getJob(promptId);
    return Uint8Array.from(MOCK_IMAGE_BYTES);
  }

  async *getProgress(promptId: string): AsyncIterable<ProgressEvent> {
    const job = this.getJob(promptId);

    yield {
      promptId,
      status: 'queued',
      step: 0,
      totalSteps: job.totalSteps,
      queuePosition: 1,
    };

    yield {
      promptId,
      status: 'processing',
      step: Math.max(1, Math.floor(job.totalSteps / 2)),
      totalSteps: job.totalSteps,
      queuePosition: 0,
    };

    yield {
      promptId,
      status: 'completed',
      step: job.totalSteps,
      totalSteps: job.totalSteps,
      queuePosition: 0,
      previewImageUrl: 'mock://preview/final',
    };
  }

  async getLoadedModel(): Promise<string | null> {
    return readImageGenEnvironment().defaultCheckpoint;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private getJob(promptId: string): MockJobRecord {
    const job = this.jobs.get(promptId);
    if (!job) {
      throw new Error(`Unknown mock prompt id: ${promptId}`);
    }

    return job;
  }
}