import { motion } from 'framer-motion';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { reflowEngine } from '@/core/engine';
import { useReflow } from '@/hooks';
import type { TransitionConfig, TransitionSource } from '@/types';

interface AdaptiveSurfaceProps {
  zoneId: string;
  children: ReactNode;
  priority?: number;
  onReflow?: (zoneId: string) => void;
}

export function AdaptiveSurface({ zoneId, children, priority, onReflow }: AdaptiveSurfaceProps) {
  const resolved = useReflow(zoneId);
  const layout = useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    () => reflowEngine.getCurrentLayout(),
    () => reflowEngine.getCurrentLayout(),
  );

  if (!resolved) {
    return <div className="adaptive-surface adaptive-surface--empty">{children}</div>;
  }

  onReflow?.(zoneId);
  const transitions = layout?.metadata.transitions;
  const source = (resolved.metadata?.['transition-source'] as TransitionSource | undefined) ?? 'default';
  const policy = resolveTransitionPolicy(transitions, source);
  const scaleBase = resolved.metadata?.scale ? Number(resolved.metadata.scale) : 1;

  return (
    <motion.section
      animate={{
        opacity: resolved.visibility === 'hidden' ? 0 : 1,
        scale: scaleBase + (source !== 'default' ? policy.scaleDelta ?? 0 : 0),
        filter: resolved.visibility === 'collapsed' ? `saturate(0.8) ${policy.blurCollapsed ?? 'blur(1px)'}` : 'saturate(1) blur(0px)',
      }}
      className="adaptive-surface"
      initial={false}
      layout
      layoutDependency={`${resolved.gridArea}-${resolved.visibility}-${resolved.zIndex}-${String(resolved.metadata?.scale ?? 1)}`}
      style={{
        gridArea: resolved.gridArea,
        zIndex: priority ?? resolved.zIndex,
        display: resolved.visibility === 'hidden' ? 'none' : 'block',
        transformOrigin: 'center center',
      }}
      transition={{
        layout: { duration: toSeconds(policy.duration, 0.45), ease: toEase(policy.easing) },
        duration: toSeconds(policy.duration, 0.35),
        ease: toEase(policy.easing),
      }}
    >
      {children}
    </motion.section>
  );
}

function resolveTransitionPolicy(config: TransitionConfig | undefined, source: TransitionSource) {
  return {
    ...config,
    ...(config?.policies?.default ?? {}),
    ...(config?.policies?.[source] ?? {}),
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