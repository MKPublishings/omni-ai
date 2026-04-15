// Ionirix Glass UI System - Glass Material Types
// Version: 1.0.0

export type GlassTier = 1 | 2 | 3;

export type GlassGlow = 'primary' | 'cyan' | 'amber';

export interface GlassProps {
    tier?: GlassTier;
    glow?: GlassGlow;
    interactive?: boolean;
}

// CSS class utilities
export const glassClasses = {
    sovereign: 'ix-glass-sovereign',
    ambient: 'ix-glass-ambient',
    whisper: 'ix-glass-whisper',
} as const;

export const glowClasses = {
    primary: 'ix-glow-primary',
    cyan: 'ix-glow-cyan',
    amber: 'ix-glow-amber',
} as const;