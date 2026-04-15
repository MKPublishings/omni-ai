// Ionirix Glass UI System - Design Tokens TypeScript Types
// Version: 1.0.0

export type IonBlueShades = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type SpectralCyanShades = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type PineBlackShades = 600 | 700 | 800 | 900;
export type AmberSignalShades = 400 | 500 | 600;

export type SpacingScale = '0-5' | '1' | '1-5' | '2' | '3' | '4' | '6' | '8' | '12' | '16';
export type BorderRadiusScale = 'sm' | 'md' | 'lg' | 'full';
export type ElevationLevel = 1 | 2 | 3 | 4 | 5;
export type MotionDuration = 'micro' | 'quick' | 'standard' | 'dramatic' | 'cinematic';

export interface IonirixTokens {
  // Core Palettes
  ionBlue: Record<IonBlueShades, string>;
  spectralCyan: Record<SpectralCyanShades, string>;
  pineBlack: Record<PineBlackShades, string>;
  amberSignal: Record<AmberSignalShades, string>;

  // Semantic Tokens
  surface: {
    base: string;
    elevated: string;
    glass: string;
    glassHover: string;
    glassActive: string;
  };
  border: {
    glass: string;
    glassStrong: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  accent: {
    primary: string;
    secondary: string;
    warning: string;
  };
  glow: {
    primary: string;
    cyan: string;
    amber: string;
  };

  // Typography
  font: {
    body: string;
    mono: string;
    display: string;
  };

  // Spacing
  space: Record<SpacingScale, string>;

  // Border Radius
  radius: Record<BorderRadiusScale, string>;

  // Elevation
  shadow: Record<ElevationLevel, string>;

  // Motion
  ease: {
    sovereign: string;
    ambient: string;
    grok: string;
    settle: string;
  };
  duration: Record<MotionDuration, string>;
}

// Export the CSS file for importing
// export { default } from './index.css';