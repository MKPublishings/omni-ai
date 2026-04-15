import { forwardRef, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type GlassTier = 1 | 2 | 3
type GlassGlow = 'primary' | 'cyan' | 'amber'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  tier?: GlassTier
  glow?: GlassGlow
  interactive?: boolean
}

const tierClasses = {
  1: 'ix-glass-sovereign',
  2: 'ix-glass-ambient',
  3: 'ix-glass-whisper',
} as const

const glowClasses = {
  primary: 'ix-glow-primary',
  cyan: 'ix-glow-cyan',
  amber: 'ix-glow-amber',
} as const

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ tier = 1, glow, interactive, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          tierClasses[tier],
          glow && glowClasses[glow],
          interactive && 'cursor-pointer',
          className
        )}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'