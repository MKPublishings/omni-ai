import { useMemo } from 'react';
import { validateLayoutSchema } from '@/core/schema';
import type { LayoutSchema } from '@/types';

export function useLayoutSchema(input: LayoutSchema) {
  const schema = useMemo(() => validateLayoutSchema(input), [input]);
  return { schema };
}