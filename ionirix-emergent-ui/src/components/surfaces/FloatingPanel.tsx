import type { CSSProperties, ReactNode } from 'react';
import { useSpatialContext } from '@/hooks/useSpatialContext';
import { GlassCard } from './GlassCard';

interface FloatingPanelProps {
  anchor?: DOMRect | null;
  targetZone?: string;
  preferredPosition: 'top' | 'bottom' | 'left' | 'right';
  avoidZones?: string[];
  children: ReactNode;
}

export function FloatingPanel({ anchor, targetZone, preferredPosition, avoidZones = [], children }: FloatingPanelProps) {
  const snapshot = useSpatialContext();
  const derivedAnchor = targetZone ? snapshot?.frames[targetZone] : null;

  if (!anchor && !derivedAnchor) {
    return null;
  }

  const source = anchor
    ? { top: anchor.top, bottom: anchor.bottom, left: anchor.left, right: anchor.right }
    : {
        top: derivedAnchor?.y ?? 0,
        bottom: (derivedAnchor?.y ?? 0) + (derivedAnchor?.height ?? 0),
        left: derivedAnchor?.x ?? 0,
        right: (derivedAnchor?.x ?? 0) + (derivedAnchor?.width ?? 0),
      };

  const avoidOffset = avoidZones.reduce((offset, zoneId) => {
    const frame = snapshot?.frames[zoneId];
    return frame ? offset + Math.min(18, frame.height * 0.05) : offset;
  }, 0);

  const style: CSSProperties = {
    position: 'fixed',
    top: preferredPosition === 'bottom' ? source.bottom + 12 + avoidOffset : source.top - 120 - avoidOffset,
    left: preferredPosition === 'right' ? source.right + 12 : source.left,
    width: 260,
    zIndex: 120,
  };

  return (
    <GlassCard className="floating-panel" depth={2} style={style}>
      {children}
    </GlassCard>
  );
}