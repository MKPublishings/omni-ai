export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | null;
export type ThemePreference = 'dark' | 'light' | 'system';
export type DensityPreference = 'compact' | 'comfortable' | 'spacious';
export type MotionPreference = 'full' | 'reduced' | 'none';
export type LayoutMode = 'grid' | 'stack' | 'float';
export type SidebarPosition = 'left' | 'right' | 'hidden';

export interface UserProfile {
  name: string;
  role: string;
  experience: ExperienceLevel;
}

export interface EnvironmentConfig {
  theme: ThemePreference;
  density: DensityPreference;
  motionPreference: MotionPreference;
}

export interface SpatialPreferences {
  layoutMode: LayoutMode;
  sidebarPosition: SidebarPosition;
  zoneCount: number;
}

export interface OnboardingContext {
  currentStep: number;
  userProfile: UserProfile;
  selectedCapabilities: string[];
  environmentConfig: EnvironmentConfig;
  spatialPreferences: SpatialPreferences;
  interactionHistory: Array<{
    event: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
}

export type OnboardingEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'UPDATE_PROFILE'; data: Partial<UserProfile> }
  | { type: 'SELECT_CAPABILITY'; capability: string }
  | { type: 'REMOVE_CAPABILITY'; capability: string }
  | { type: 'CONFIGURE_ENV'; config: Partial<EnvironmentConfig> }
  | { type: 'SET_SPATIAL'; prefs: Partial<SpatialPreferences> }
  | { type: 'CALIBRATE' }
  | { type: 'COMPLETE' };

export interface UIContext {
  activeZones: string[];
  focusedZone: string | null;
  densityLevel: number;
  immersionDepth: number;
}

export type UIEvent =
  | { type: 'FOCUS_ZONE'; zoneId: string }
  | { type: 'BLUR_ZONE' }
  | { type: 'EXPAND' }
  | { type: 'COLLAPSE' }
  | { type: 'ENTER_IMMERSIVE' }
  | { type: 'EXIT_IMMERSIVE' }
  | { type: 'SET_DENSITY'; level: number }
  | { type: 'RESET' };

export interface Capability {
  id: string;
  label: string;
  description: string;
}