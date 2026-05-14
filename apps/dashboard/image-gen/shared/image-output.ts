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

  if (Array.isArray(raw)) {
    for (let index = raw.length - 1; index >= 0; index -= 1) {
      try {
        return await normalizeGeneratedImageOutput(raw[index]);
      } catch {
        // Continue scanning from newest/final candidate to oldest.
      }
    }

    throw new Error('Unsupported image response format');
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

  const imageNode = (raw as { image?: unknown })?.image;
  const resultBytes = (raw as { result?: { bytes?: unknown } })?.result?.bytes;
  const resultImageNode = (raw as { result?: { image?: unknown } })?.result?.image;
  const dataNodes = (raw as { data?: Array<{ b64_json?: unknown }> })?.data;
  const outputNodes = (raw as { output?: Array<{ image?: unknown }> })?.output;

  const dataCandidate = Array.isArray(dataNodes) && dataNodes.length > 0
    ? dataNodes[dataNodes.length - 1]?.b64_json
    : undefined;
  const outputCandidate = Array.isArray(outputNodes) && outputNodes.length > 0
    ? outputNodes[outputNodes.length - 1]?.image
    : undefined;

  const candidate =
    (Array.isArray(imageNode) && imageNode.length > 0 ? imageNode[imageNode.length - 1] : imageNode) ??
    (Array.isArray(resultBytes) && resultBytes.length > 0 ? resultBytes[resultBytes.length - 1] : resultBytes) ??
    (Array.isArray(resultImageNode) && resultImageNode.length > 0 ? resultImageNode[resultImageNode.length - 1] : resultImageNode) ??
    dataCandidate ??
    outputCandidate;

  if (Array.isArray(candidate)) {
    for (let index = candidate.length - 1; index >= 0; index -= 1) {
      try {
        return await normalizeGeneratedImageOutput(candidate[index]);
      } catch {
        // Continue scanning from newest/final candidate to oldest.
      }
    }

    throw new Error('Unsupported image response format');
  }

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