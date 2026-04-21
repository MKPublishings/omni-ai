import type { LayoutSchema } from '@/types';

export const createEmptyLayoutSchema = (): LayoutSchema => ({
  version: '1.0.0',
  surface: {
    id: 'empty-surface',
    type: 'emergent',
    zones: [],
  },
});

export type { LayoutSchema };