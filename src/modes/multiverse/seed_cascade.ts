import { createHash } from "node:crypto";

export type Seed64 = bigint;

const MASK_64 = 0xffffffffffffffffn;

export function deriveSeed(parentSeed: Seed64, childIndex: bigint): Seed64 {
  const buffer = Buffer.alloc(16);
  buffer.writeBigUInt64BE(parentSeed & MASK_64, 0);
  buffer.writeBigUInt64BE(childIndex & MASK_64, 8);
  const hash = createHash("sha256").update(buffer).digest();
  return hash.readBigUInt64BE(0);
}

export class SplitMix64 {
  private state: bigint;

  constructor(seed: Seed64) {
    this.state = seed & MASK_64;
  }

  next(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK_64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
    z = (z ^ (z >> 31n)) & MASK_64;
    return z;
  }

  nextFloat(): number {
    return Number(this.next() >> 11n) / (2 ** 53);
  }

  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  nextGaussian(mean: number, stddev: number): number {
    const u1 = this.nextFloat() || 1e-12;
    const u2 = this.nextFloat();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stddev;
  }
}
