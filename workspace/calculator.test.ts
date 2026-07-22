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
    const res = add(0, 5);
    expect(res).toEqual({ ok: true, value: 5 });
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

  it("divides to produce fractional results", () => {
    const res = divide(1, 2);
    expect(res).toEqual({ ok: true, value: 0.5 });
  });

  it("divides negative numbers", () => {
    const res = divide(-10, 2);
    expect(res).toEqual({ ok: true, value: -5 });
  });

  it("returns Division by zero when dividing by zero", () => {
    expect(divide(1, 0)).toEqual({ ok: false, error: "Division by zero" });
  });

  it("returns error for non-finite inputs", () => {
    expect(divide(NaN, 1)).toEqual({ ok: false, error: "Invalid number" });
    expect(divide(1, Infinity)).toEqual({ ok: false, error: "Invalid number" });
    expect(divide(Infinity, NaN)).toEqual({ ok: false, error: "Invalid number" });
  });
});
