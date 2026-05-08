export * from '../../shared/image-output';
export interface NormalizedImageOutput {
  bytes: Uint8Array;
  mimeType: string;
}

export function isReadableByteStream(value: unknown): value is ReadableStream {
  return !!value && typeof (value as ReadableStream).getReader === 'function';
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function normalizeGeneratedImageOutput(raw: unknown): Promise<NormalizedImageOutput> {
  if (!raw) {
    throw new Error('Empty image response');
  }

  if (raw instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(raw), mimeType: 'image/png' };
  }

  if (ArrayBuffer.isView(raw)) {
    const view = raw as ArrayBufferView;
    return { bytes: new Uint8Array(view.buffer, view.byteOffset, view.byteLength), mimeType: 'image/png' };
  }

  if (isReadableByteStream(raw)) {
    const buffer = await new Response(raw as ReadableStream).arrayBuffer();
    return { bytes: new Uint8Array(buffer), mimeType: 'image/png' };
  }

  const candidate =
    (raw as { image?: unknown })?.image ??
    (raw as { result?: { bytes?: unknown; image?: unknown } })?.result?.bytes ??
    (raw as { result?: { image?: unknown } })?.result?.image ??
    (raw as { data?: Array<{ b64_json?: unknown }> })?.data?.[0]?.b64_json ??
    (raw as { output?: Array<{ image?: unknown }> })?.output?.[0]?.image;

  if (candidate instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(candidate), mimeType: 'image/png' };
  }

  if (ArrayBuffer.isView(candidate)) {
    const view = candidate as ArrayBufferView;
    return { bytes: new Uint8Array(view.buffer, view.byteOffset, view.byteLength), mimeType: 'image/png' };
  }

  if (typeof candidate === 'string') {
    if (candidate.startsWith('data:image/')) {
      const commaIndex = candidate.indexOf(',');
      if (commaIndex <= 0) {
        throw new Error('Image response included malformed data URL');
      }

      const header = candidate.slice(5, commaIndex);
      const payload = candidate.slice(commaIndex + 1);
      const mimeType = header.split(';')[0] || 'image/png';
      return { bytes: base64ToBytes(payload), mimeType };
    }

    const mimeType =
      (raw as { mimeType?: string })?.mimeType ||
      (raw as { contentType?: string })?.contentType ||
      (raw as { content_type?: string })?.content_type ||
      'image/png';

    return { bytes: base64ToBytes(candidate), mimeType };
  }

  throw new Error('Unsupported image response format');
}