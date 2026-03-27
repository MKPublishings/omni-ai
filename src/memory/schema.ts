export interface IONUserMemory {
  preferredMode?: string;
  lastUsed?: string;
  emotionalTone?: string;
  conversationFingerprint?: string;
}

export interface IONSystemMemory {
  totalSessions: number;
  lastSessionTime: string;
  modeUsage: Record<string, number>;
}

export interface IONMemoryBundle {
  user: IONUserMemory;
  system: IONSystemMemory;
}