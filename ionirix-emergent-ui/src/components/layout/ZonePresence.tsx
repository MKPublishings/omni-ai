import { AnimatePresence, motion } from 'framer-motion';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { reflowEngine } from '@/core/engine';
import { useReflow } from '@/hooks';
import type { TransitionConfig } from '@/types';

interface ZonePresenceProps {
  zoneId: string;
  children: ReactNode;
}

export function ZonePresence({ zoneId, children }: ZonePresenceProps) {
  const resolved = useReflow(zoneId);
  const layout = useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    () => reflowEngine.getCurrentLayout(),
    () => reflowEngine.getCurrentLayout(),
  );
  const isPresent = resolved?.visibility !== 'hidden';
  const presencePolicy = resolvePresencePolicy(layout?.metadata.transitions);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {resolved && isPresent ? (
        <motion.div
          key={zoneId}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: presencePolicy.yOffset ?? 14, scale: 1 - (presencePolicy.scaleDelta ?? 0.02) }}
          initial={{ opacity: 0, y: (presencePolicy.yOffset ?? 14) + 4, scale: 1 - ((presencePolicy.scaleDelta ?? 0.02) * 2) }}
          layout
          transition={{ duration: toSeconds(presencePolicy.duration, 0.28), ease: toEase(presencePolicy.easing) }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function resolvePresencePolicy(config: TransitionConfig | undefined) {
  return {
    ...config,
    ...(config?.policies?.default ?? {}),
    ...(config?.policies?.presence ?? {}),
  };
}

function toSeconds(duration: string | undefined, fallback: number) {
  if (!duration) {
    return fallback;
  }

  if (duration.endsWith('ms')) {
    return Number(duration.replace('ms', '')) / 1000;
  }

  if (duration.endsWith('s')) {
    return Number(duration.replace('s', ''));
  }

  return fallback;
}

function toEase(easing: string | undefined): [number, number, number, number] {
  if (!easing) {
    return [0.16, 1, 0.3, 1];
  }

  const match = easing.match(/cubic-bezier\(([^)]+)\)/i);

  if (!match) {
    return [0.16, 1, 0.3, 1];
  }

  const curve = match[1];

  if (!curve) {
    return [0.16, 1, 0.3, 1];
  }

  const values = curve
    .split(',')
    .map((segment) => Number(segment.trim()))
    .filter((segment) => !Number.isNaN(segment));

  if (values.length !== 4) {
    return [0.16, 1, 0.3, 1];
  }

  const [x1, y1, x2, y2] = values as [number, number, number, number];
  return [x1, y1, x2, y2];
}