import { readImageGenEnvironment } from '../config/env';
import type {
  IImageArtifactStorage,
  JsonValue,
  StoredImageArtifact,
  StoredMetadataRecord,
} from '../shared/types';

type EnvironmentSource = Record<string, unknown>;

interface StoredImageArtifactRecord {
  artifact: StoredImageArtifact;
  bytes: Uint8Array;
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

export class InMemoryImageArtifactStorage implements IImageArtifactStorage {
  private readonly images = new Map<string, StoredImageArtifactRecord>();
  private readonly metadata = new Map<string, StoredMetadataRecord<unknown>>();
  private readonly imageStoragePath: string;
  private readonly thumbnailStoragePath: string;
  private readonly metadataDbUrl: string;

  constructor(source?: EnvironmentSource) {
    const env = readImageGenEnvironment(source);
    this.imageStoragePath = env.imageStoragePath;
    this.thumbnailStoragePath = env.thumbnailStoragePath;
    this.metadataDbUrl = env.metadataDbUrl;
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

    this.images.set(artifactId, {
      artifact,
      bytes: input.bytes,
    });

    return artifact;
  }

  async getImages(jobId: string): Promise<StoredImageArtifact[]> {
    return [...this.images.values()]
      .map((entry) => entry.artifact)
      .filter((artifact) => artifact.jobId === jobId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async getImageBytes(artifactId: string): Promise<Uint8Array | null> {
    return this.images.get(artifactId)?.bytes || null;
  }

  async putMetadata<TPayload>(jobId: string, payload: TPayload): Promise<StoredMetadataRecord<TPayload>> {
    const record: StoredMetadataRecord<TPayload> = {
      jobId,
      path: `${this.metadataDbUrl}#${jobId}`,
      createdAt: nowIso(),
      payload,
    };

    this.metadata.set(jobId, record as StoredMetadataRecord<unknown>);
    return record;
  }

  async getMetadata<TPayload = JsonValue>(jobId: string): Promise<StoredMetadataRecord<TPayload> | null> {
    const record = this.metadata.get(jobId);
    return (record as StoredMetadataRecord<TPayload> | undefined) || null;
  }
}