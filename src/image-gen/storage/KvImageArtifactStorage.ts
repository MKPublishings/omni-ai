import { base64ToBytes, bytesToBase64 } from '../../shared/image-output';
import type {
  IImageArtifactStorage,
  JsonValue,
  StoredImageArtifact,
  StoredMetadataRecord,
} from '../shared/types';

interface KvLike {
  get(key: string, type?: string): Promise<unknown> | unknown;
  put(key: string, value: string): Promise<void> | void;
}

interface StoredArtifactPayload {
  artifact: StoredImageArtifact;
  bytesBase64: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function extensionForMimeType(mimeType: string): string {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  return 'png';
}

async function readJson<T>(kv: KvLike, key: string, fallback: T): Promise<T> {
  const value = await kv.get(key, 'json');
  if (value === null || value === undefined) {
    return fallback;
  }

  return value as T;
}

async function writeJson(kv: KvLike, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

export class KvImageArtifactStorage implements IImageArtifactStorage {
  private readonly imageStoragePath: string;
  private readonly thumbnailStoragePath: string;
  private readonly metadataDbUrl: string;
  private readonly prefix: string;

  constructor(
    private readonly kv: KvLike,
    options?: { namespace?: string; imageStoragePath?: string; thumbnailStoragePath?: string; metadataDbUrl?: string },
  ) {
    this.prefix = String(options?.namespace || 'ion:image:storage').trim() || 'ion:image:storage';
    this.imageStoragePath = String(options?.imageStoragePath || './storage/images');
    this.thumbnailStoragePath = String(options?.thumbnailStoragePath || './storage/thumbs');
    this.metadataDbUrl = String(options?.metadataDbUrl || 'memory://image-meta');
  }

  async putImage(input: {
    jobId: string;
    kind: 'image' | 'thumbnail';
    bytes: Uint8Array;
    mimeType: string;
    format: 'png' | 'webp' | 'jpeg';
    width: number;
    height: number;
  }): Promise<StoredImageArtifact> {
    const artifactId = `artifact-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const extension = extensionForMimeType(input.mimeType);
    const basePath = input.kind === 'thumbnail' ? this.thumbnailStoragePath : this.imageStoragePath;

    const artifact: StoredImageArtifact = {
      artifactId,
      jobId: input.jobId,
      kind: input.kind,
      path: `${basePath}/${input.jobId}/${artifactId}.${extension}`,
      mimeType: input.mimeType,
      format: input.format,
      width: input.width,
      height: input.height,
      sizeBytes: input.bytes.byteLength,
      createdAt,
    };

    const artifactPayload: StoredArtifactPayload = {
      artifact,
      bytesBase64: bytesToBase64(input.bytes),
    };

    const artifactIds = await this.readArtifactIndex(input.jobId);
    artifactIds.push(artifactId);

    await Promise.all([
      writeJson(this.kv, this.artifactKey(artifactId), artifactPayload),
      writeJson(this.kv, this.artifactIndexKey(input.jobId), artifactIds),
    ]);

    return artifact;
  }

  async getImages(jobId: string): Promise<StoredImageArtifact[]> {
    const artifactIds = await this.readArtifactIndex(jobId);
    const artifacts = await Promise.all(artifactIds.map(async (artifactId) => {
      const payload = await readJson<StoredArtifactPayload | null>(this.kv, this.artifactKey(artifactId), null);
      return payload?.artifact || null;
    }));

    return artifacts
      .filter((artifact): artifact is StoredImageArtifact => Boolean(artifact))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async getImageBytes(artifactId: string): Promise<Uint8Array | null> {
    const payload = await readJson<StoredArtifactPayload | null>(this.kv, this.artifactKey(artifactId), null);
    if (!payload) {
      return null;
    }

    return base64ToBytes(payload.bytesBase64);
  }

  async putMetadata<TPayload>(jobId: string, payload: TPayload): Promise<StoredMetadataRecord<TPayload>> {
    const record: StoredMetadataRecord<TPayload> = {
      jobId,
      path: `${this.metadataDbUrl}#${jobId}`,
      createdAt: nowIso(),
      payload,
    };

    await writeJson(this.kv, this.metadataKey(jobId), record);
    return record;
  }

  async getMetadata<TPayload = JsonValue>(jobId: string): Promise<StoredMetadataRecord<TPayload> | null> {
    return readJson<StoredMetadataRecord<TPayload> | null>(this.kv, this.metadataKey(jobId), null);
  }

  private async readArtifactIndex(jobId: string): Promise<string[]> {
    return readJson<string[]>(this.kv, this.artifactIndexKey(jobId), []);
  }

  private artifactIndexKey(jobId: string): string {
    return `${this.prefix}:job:${jobId}:artifacts`;
  }

  private artifactKey(artifactId: string): string {
    return `${this.prefix}:artifact:${artifactId}`;
  }

  private metadataKey(jobId: string): string {
    return `${this.prefix}:job:${jobId}:metadata`;
  }
}