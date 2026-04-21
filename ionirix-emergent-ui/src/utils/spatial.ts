import type { ViewportContext } from '@/types';

export const getViewportContext = (): ViewportContext => ({
  width: window.innerWidth,
  height: window.innerHeight,
  density: window.devicePixelRatio || 1,
});