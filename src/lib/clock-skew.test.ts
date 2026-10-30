import { describe, expect, it } from "vitest";
import { getClockSkewSeconds, hasClockSkew } from "./clock-skew";

const token = (iat: number) =>
  `x.${btoa(JSON.stringify({ iat })).replace(/=+$/, "")}.y`;

describe("clock skew detection", () => {
  const iat = 1_800_000_000;

  it("accepts a device clock within 1 minute of the server", () => {
    expect(hasClockSkew(token(iat), (iat + 30) * 1000)).toBe(false);
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

describe("clock correction", () => {
  it("shifts the app clock to the server time when the device is 1 hour behind", async () => {
    const { syncClockFromToken, getClockOffsetMs } = await import("./clock-skew");
    const realNow = Date.now();
    const serverIat = Math.round(realNow / 1000) + 3600; // server is 1h ahead of device
    expect(syncClockFromToken(token(serverIat))).toBe(-3600);
    expect(getClockOffsetMs()).toBe(3600_000);
    expect(Math.abs(Date.now() - serverIat * 1000)).toBeLessThan(5000);
    expect(Math.abs(new Date().getTime() - serverIat * 1000)).toBeLessThan(5000);
    // Explicit dates are untouched.
    expect(new Date(0).getTime()).toBe(0);
    // A correct clock clears the correction.
    syncClockFromToken(token(Math.round((realNow + 3600_000) / 1000) - 3600 + 0));
  });
});
