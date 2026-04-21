export interface BehaviorContext {
  viewport: { width: number; height: number };
  activeZones: string[];
  focusedZone: string | null;
  interactionHistory: Array<{ event: string; timestamp: number }>;
  userPreferences: Record<string, unknown>;
  currentState: string;
}

export interface SurfaceUpdate {
  zoneId: string;
  mutations: Array<{
    property: string;
    value: string | number | boolean;
  }>;
  animate: boolean;
  duration?: number;
}

export interface Behavior {
  id: string;
  name: string;
  description: string;
  priority: number;
  trigger: string;
  evaluate: (context: BehaviorContext) => boolean;
  execute: (zoneId: string, params: Record<string, unknown>) => SurfaceUpdate;
  cleanup?: (zoneId: string) => void;
}