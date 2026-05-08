import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeGeneratedImageOutput } from '../../shared/image-output.ts';

test('shared image output helper decodes url-safe data urls', async () => {
  const raw = 'data:image/png;base64,iVBORw0KGgo';
  const normalized = await normalizeGeneratedImageOutput(raw);

  assert.equal(normalized.mimeType, 'image/png');
  assert.deepEqual(Array.from(normalized.bytes), [137, 80, 78, 71, 13, 10, 26, 10]);
});