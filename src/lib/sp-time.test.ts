import { describe, expect, it } from "vitest";
import { SP_TIMEZONE, spDayKey, formatSpDateTime, formatSpDate } from "./sp-time";

describe("sp-time helpers", () => {
  it("spDayKey uses the São Paulo calendar day, not the device timezone", () => {
    // 2026-10-30 02:30 UTC is still 2026-10-29 23:30 in São Paulo.
    expect(spDayKey(new Date("2026-10-30T02:30:00Z"))).toBe("2026-10-29");
    // 2026-10-30 03:30 UTC is 2026-10-30 00:30 in São Paulo.
    expect(spDayKey(new Date("2026-10-30T03:30:00Z"))).toBe("2026-10-30");
  });

  it("formatSpDateTime renders São Paulo time in pt-BR style", () => {
    const out = formatSpDateTime("2026-10-30T18:39:00Z", "numeric");
    expect(out).toContain("30/10/2026");
    expect(out).toContain("15:39");
  });

  it("formatSpDate renders the São Paulo date", () => {
    expect(formatSpDate("2026-10-30T02:30:00Z")).toContain("Oct 29");
  });

  it("declares the pinned timezone", () => {
    expect(SP_TIMEZONE).toBe("America/Sao_Paulo");
  });
});
