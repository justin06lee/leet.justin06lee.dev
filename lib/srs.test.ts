import { describe, it, expect } from "vitest";
import { schedule, DEFAULT_SRS, type SrsCore } from "./srs";

describe("schedule", () => {
  it("first good review", () => {
    const s = schedule(DEFAULT_SRS, 2, 100);
    expect(s.reps).toBe(1);
    expect(s.intervalDays).toBe(1);
    expect(s.dueDay).toBe(101);
    expect(s.lastGrade).toBe(2);
  });

  it("second good review jumps to 6 days", () => {
    const s = schedule(
      { ...DEFAULT_SRS, reps: 1, intervalDays: 1, ease: 2.5 },
      2,
      100,
    );
    expect(s.reps).toBe(2);
    expect(s.intervalDays).toBe(6);
    expect(s.dueDay).toBe(106);
  });

  it("third good review multiplies prev interval by ease", () => {
    const prev: SrsCore = {
      ...DEFAULT_SRS,
      reps: 2,
      intervalDays: 6,
      ease: 2.5,
    };
    const s = schedule(prev, 2, 100);
    // ease = clamp(2.5 + (0.1 - 2*0.08)) = clamp(2.44) = 2.44
    expect(s.ease).toBeCloseTo(2.44, 10);
    // interval = round(6 * 2.44) = round(14.64) = 15
    expect(s.intervalDays).toBe(15);
    expect(s.reps).toBe(3);
    expect(s.dueDay).toBe(115);
  });

  it("grade 0 (again) resets reps and increments lapses", () => {
    const prev: SrsCore = {
      ease: 2.5,
      intervalDays: 30,
      reps: 5,
      lapses: 1,
      lastGrade: 3,
    };
    const s = schedule(prev, 0, 100);
    expect(s.reps).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.lapses).toBe(2);
    expect(s.ease).toBeCloseTo(prev.ease - 0.2, 10);
    expect(s.dueDay).toBe(101);
    expect(s.lastGrade).toBe(0);
  });

  it("ease never exceeds 3.0 under repeated grade 4", () => {
    let core: SrsCore = { ...DEFAULT_SRS };
    for (let i = 0; i < 50; i++) {
      core = schedule(core, 4, 100 + i);
      expect(core.ease).toBeLessThanOrEqual(3.0);
    }
    expect(core.ease).toBe(3.0);
  });

  it("ease never drops below 1.3 under repeated grade 0", () => {
    let core: SrsCore = { ...DEFAULT_SRS };
    for (let i = 0; i < 50; i++) {
      core = schedule(core, 0, 100 + i);
      expect(core.ease).toBeGreaterThanOrEqual(1.3);
    }
    expect(core.ease).toBe(1.3);
  });

  it("hard (1) yields a smaller interval than good (2) from same prev", () => {
    const prev: SrsCore = {
      ...DEFAULT_SRS,
      reps: 3,
      intervalDays: 20,
      ease: 2.5,
    };
    const hard = schedule(prev, 1, 100);
    const good = schedule(prev, 2, 100);
    expect(hard.intervalDays).toBeLessThan(good.intervalDays);
  });

  it("easy (4) raises ease by exactly 0.10 from a mid value", () => {
    const prev: SrsCore = { ...DEFAULT_SRS, ease: 2.5 };
    const s = schedule(prev, 4, 100);
    // ease = clamp(2.5 + (0.1 - 0*0.08)) = 2.6
    expect(s.ease).toBeCloseTo(2.6, 10);
  });
});
