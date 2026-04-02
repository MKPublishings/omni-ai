// =============================================================================
// rng.ts
// Ionirix Cosmic Mode - Deterministic Mulberry32 RNG
// =============================================================================

import type { SeededRNG } from "./cosmic_schema.ts";

export class Mulberry32RNG implements SeededRNG {
  public seed: number;
  public state: number;

  constructor(seed: number) {
    this.seed = seed | 0;
    this.state = seed | 0;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 + 1e-30)) * Math.cos(2 * Math.PI * u2);
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public fork(label: string): SeededRNG {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = (Math.imul(31, hash) + label.charCodeAt(i)) | 0;
    }
    return new Mulberry32RNG(this.seed ^ hash);
  }
}
