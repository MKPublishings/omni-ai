import { NextResponse } from 'next/server'

function readBoolean(key: string, fallback: boolean): boolean {
  const value = String(process.env[key] || '').trim().toLowerCase()
  if (!value) {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(value)
}

function readNumber(key: string, fallback: number): number {
  const value = Number(process.env[key])
  return Number.isFinite(value) ? value : fallback
}

function readText(key: string, fallback: string): string {
  const value = String(process.env[key] || '').trim()
  return value || fallback
}

function readTextAny(keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim()
    if (value) {
      return value
    }
  }

  return fallback
}

function readBooleanAny(keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const value = String(process.env[key] || '').trim().toLowerCase()
    if (!value) {
      continue
    }

    return ['1', 'true', 'yes', 'on'].includes(value)
  }

  return fallback
}

function readNumberAny(keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = Number(process.env[key])
    if (Number.isFinite(value)) {
      return value
    }
  }

  return fallback
}

export async function POST() {
  const forcedCheckpoint = 'ion-citizen-xl-vpred-v2.0'

  return NextResponse.json({
    gateway: {
      host: readTextAny(['ION_HOST', 'ion_HOST'], 'http://localhost:8188'),
      wsUrl: readTextAny(['ION_WS', 'ion_WS'], 'ws://localhost:8188/ws'),
      mock: readBooleanAny(['ION_MOCK', 'ion_MOCK'], true),
      requestTimeoutMs: readNumberAny(['ION_REQUEST_TIMEOUT_MS', 'ion_REQUEST_TIMEOUT_MS'], 120000),
      defaultCheckpoint: forcedCheckpoint,
    },
    queue: {
      runtime: readText('IMAGE_QUEUE_RUNTIME', 'memory') === 'kv' ? 'kv' : 'memory',
      stateBinding: readText('IMAGE_QUEUE_STATE_BINDING', 'ION_IMAGE_STATE_KV'),
      stateNamespace: readText('IMAGE_QUEUE_STATE_NAMESPACE', 'ion:image:queue'),
      maxQueueSize: readNumber('MAX_QUEUE_SIZE', 100),
      maxConcurrentJobs: readNumber('MAX_CONCURRENT_JOBS', 2),
    },
    storage: {
      imageStoragePath: readText('IMAGE_STORAGE_PATH', './storage/images'),
      thumbnailStoragePath: readText('THUMBNAIL_STORAGE_PATH', './storage/thumbs'),
      metadataDbUrl: readText('METADATA_DB_URL', 'sqlite:./storage/metadata.db'),
    },
    safety: {
      enabled: readBoolean('SAFETY_ENABLED', true),
      nsfwThreshold: readNumber('SAFETY_NSFW_THRESHOLD', 0.7),
      rateLimitPerHour: readNumber('RATE_LIMIT_PER_HOUR', 30),
    },
    logging: {
      level: readText('LOG_LEVEL', 'info'),
      format: readText('LOG_FORMAT', 'json') === 'pretty' ? 'pretty' : 'json',
    },
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}