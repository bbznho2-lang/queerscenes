import { describe, expect, it } from "vitest";
import { getClockSkewSeconds, hasClockSkew } from "./clock-skew";

const token = (iat: number) =>
  `x.${btoa(JSON.stringify({ iat })).replace(/=+$/, "")}.y`;

describe("clock skew detection", () => {
  const iat = 1_800_000_000;

  it("accepts a device clock within 5 minutes of the server", () => {
    expect(hasClockSkew(token(iat), (iat + 120) * 1000)).toBe(false);
  });

  it("flags a device clock 3 hours ahead (wrong Windows time zone)", () => {
    expect(getClockSkewSeconds(token(iat), (iat + 3 * 3600) * 1000)).toBe(10800);
    expect(hasClockSkew(token(iat), (iat + 3 * 3600) * 1000)).toBe(true);
  });

  it("flags a device clock more than 5 minutes behind", () => {
    expect(hasClockSkew(token(iat), (iat - 600) * 1000)).toBe(true);
  });

  it("ignores tokens it cannot read", () => {
    expect(hasClockSkew("not-a-token")).toBe(false);
  });
});
