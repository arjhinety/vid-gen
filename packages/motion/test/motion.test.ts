import { describe, expect, it } from "vitest";
import { cubicBezier, ease, interpolate, mixColor, progress, rng, spring, springs } from "../src/index.ts";

describe("easing", () => {
  it("cubic-bezier matches CSS 'ease-in-out' at known points", () => {
    const e = cubicBezier(0.42, 0, 0.58, 1);
    expect(e(0)).toBe(0);
    expect(e(1)).toBe(1);
    expect(e(0.5)).toBeCloseTo(0.5, 5); // symmetric curve
    expect(e(0.25)).toBeCloseTo(0.1291, 3);
  });
  it("named curves are monotone on [0,1]", () => {
    for (const [name, f] of Object.entries(ease)) {
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const v = f(i / 100);
        expect(v, name).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
      }
    }
  });
});

describe("interpolate / progress", () => {
  it("maps piecewise and clamps by default", () => {
    expect(interpolate(5, [0, 10], [100, 200])).toBe(150);
    expect(interpolate(-5, [0, 10], [100, 200])).toBe(100);
    expect(interpolate(15, [0, 10, 20], [0, 1, 0])).toBe(0.5);
  });
  it("progress is 0 before start, 1 after end", () => {
    expect(progress(9, 10, 30)).toBe(0);
    expect(progress(40, 10, 30)).toBe(1);
    expect(progress(25, 10, 30, ease.linear)).toBe(0.5);
  });
});

describe("spring", () => {
  it("starts at 0 and settles at 1", () => {
    expect(spring(0)).toBe(0);
    expect(spring(3, springs.calm)).toBeCloseTo(1, 3);
  });
  it("the physical preset overshoots and the calm preset does not", () => {
    const max = (cfg: typeof springs.calm) => Math.max(...Array.from({ length: 200 }, (_, i) => spring(i / 60, cfg)));
    expect(max(springs.physical)).toBeGreaterThan(1.01);
    expect(max(springs.calm)).toBeLessThanOrEqual(1.0001);
  });
});

describe("color + randomness", () => {
  it("mixes in OKLab and keeps endpoints exact", () => {
    expect(mixColor("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixColor("#000000", "#ffffff", 1)).toBe("#ffffff");
    // OKLab midpoint of black and white is perceptual mid-grey, not #808080
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#636363");
  });
  it("seeded rng is reproducible", () => {
    const a = rng("scene-1");
    const b = rng("scene-1");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
