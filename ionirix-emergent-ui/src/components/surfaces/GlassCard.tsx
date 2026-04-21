import type { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  depth?: 0 | 1 | 2 | 3;
  glow?: boolean;
  interactive?: boolean;
}

export function GlassCard({
  children,
  depth = 1,
  glow = false,
  interactive = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`glass-card depth-${depth} ${glow ? 'is-glowing' : ''} ${interactive ? 'is-interactive' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}