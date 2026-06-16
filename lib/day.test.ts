import { describe, it, expect } from "vitest";
import { epochDay, dayToISO, isoToDay } from "./day";

describe("day helpers", () => {
  it("dayToISO is the inverse of isoToDay", () => {
    expect(dayToISO(isoToDay("2026-06-16"))).toBe("2026-06-16");
    expect(dayToISO(isoToDay("2020-01-01"))).toBe("2020-01-01");
  });

  it("epochDay of UTC midnight equals isoToDay", () => {
    expect(epochDay(new Date("2026-06-16T00:00:00Z"))).toBe(
      isoToDay("2026-06-16"),
    );
  });

  it("epochDay floors within a day to the same index", () => {
    const day = isoToDay("2026-06-16");
    expect(epochDay(new Date("2026-06-16T23:59:59Z"))).toBe(day);
    expect(epochDay(new Date("2026-06-16T00:00:00Z"))).toBe(day);
  });
});
