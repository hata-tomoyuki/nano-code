import { describe, it, expect } from "vitest";
import { add, divide } from "./calculator";

describe("add", () => {
  it("adds two positive numbers", () => {
    const res = add(2, 3);
    expect(res).toEqual({ ok: true, value: 5 });
  });

  it("adds negative numbers", () => {
    const res = add(-2, -3);
    expect(res).toEqual({ ok: true, value: -5 });
  });

  it("adds zero correctly", () => {
    expect(add(0, 0)).toEqual({ ok: true, value: 0 });
    expect(add(5, 0)).toEqual({ ok: true, value: 5 });
    expect(add(0, -5)).toEqual({ ok: true, value: -5 });
  });

  it("adds floating point numbers", () => {
    const res = add(0.1, 0.2);
    // allow for JS floating point precision
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(Math.abs(res.value - 0.30000000000000004)).toBeLessThan(1e-12);
    }
  });

  it("handles large finite numbers", () => {
    const res = add(Number.MAX_SAFE_INTEGER, 1);
    expect(res).toEqual({ ok: true, value: Number.MAX_SAFE_INTEGER + 1 });
  });

  it("returns error for non-finite inputs", () => {
    expect(add(NaN, 1)).toEqual({ ok: false, error: "Invalid number" });
    expect(add(Infinity, 1)).toEqual({ ok: false, error: "Invalid number" });
    expect(add(1, Infinity)).toEqual({ ok: false, error: "Invalid number" });
  });
});

describe("divide", () => {
  it("divides two numbers", () => {
    const res = divide(10, 2);
    expect(res).toEqual({ ok: true, value: 5 });
  });

  it("divides to a fractional result", () => {
    const res = divide(1, 4);
    expect(res).toEqual({ ok: true, value: 0.25 });
    const res2 = divide(-10, 4);
    expect(res2).toEqual({ ok: true, value: -2.5 });
  });

  it("returns Division by zero when dividing by zero", () => {
    expect(divide(1, 0)).toEqual({ ok: false, error: "Division by zero" });
  });

  it("returns error for non-finite inputs", () => {
    expect(divide(NaN, 1)).toEqual({ ok: false, error: "Invalid number" });
    expect(divide(1, Infinity)).toEqual({ ok: false, error: "Invalid number" });
  });
});
