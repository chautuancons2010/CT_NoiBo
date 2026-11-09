import { describe, expect, it } from "vitest";
import { chartScale } from "./chartScale";

describe("dashboard chart scale", () => {
  it("uses whole people rather than fractional employee ticks", () => {
    expect(chartScale([15, 14, 12, 8, 2]).axisValues).toEqual([15, 10, 5, 0]);
    expect(chartScale([7, 4, 1]).axisValues.every(Number.isInteger)).toBe(true);
  });
  it("retains fractional and negative amounts with a zero baseline", () => {
    const scale = chartScale([-1.5, 2.75]);
    expect(scale.minimum).toBeLessThanOrEqual(-1.5);
    expect(scale.maximum).toBeGreaterThanOrEqual(2.75);
    expect(scale.axisValues).toContain(0);
    expect(chartScale([0.25, 0.4]).axisValues).toContain(0.4);
  });
  it("handles zero data and a real percentage ceiling", () => {
    expect(chartScale([0, 0])).toEqual({ minimum: 0, maximum: 1, axisValues: [1, 0] });
    expect(chartScale([98, 0], 100).maximum).toBe(100);
  });
});
