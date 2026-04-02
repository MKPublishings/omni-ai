import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveSeed } from "../seed_cascade.ts";
import { MultiverseEngine } from "../multiverse_engine.ts";

describe("Multiverse seed determinism", () => {
  it("produces stable child seeds", () => {
    const parent = 0x7a3f9c2e1b8d4f06n;
    const a = deriveSeed(parent, 42n);
    const b = deriveSeed(parent, 42n);
    assert.equal(a, b);
  });

  it("reproduces identical query results for fixed seed", async () => {
    const q = {
      type: "sphere" as const,
      coordinates: { system: "cartesian_mpc" as const, values: [0, 0, 0], radius: 4 },
      lodLevel: 4 as const,
      maxResults: 25
    };

    const e1 = new MultiverseEngine(0x7a3f9c2e1b8d4f06n);
    const e2 = new MultiverseEngine(0x7a3f9c2e1b8d4f06n);

    const r1 = await e1.query(q);
    const r2 = await e2.query(q);

    assert.deepEqual(r1.entities, r2.entities);
  });
});
