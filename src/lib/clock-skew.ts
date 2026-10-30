// Corrects a wrong device clock using the server's token issue time. A device
// clock that is off (often a wrong Windows time zone while the hour "looks"
// right) makes the auth client treat every session as expired, causing endless
// refreshes and a forced sign-out. Instead of blocking the user, we measure the
// difference from the server and shift Date / Date.now for the whole app.
export const MAX_CLOCK_SKEW_SECONDS = 60;
const STORAGE_KEY = "qs_clock_offset_ms";

const RealDate = Date;
const realNow = () => RealDate.now();
let offsetMs = 0;
let installed = false;

export function getTokenIssuedAt(accessToken: string): number | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.iat === "number" ? json.iat : null;
  } catch {
    return null;
  }
}

/** Seconds the device clock is ahead (+) or behind (-) of the server, or null. */
export function getClockSkewSeconds(accessToken: string, nowMs = realNow()): number | null {
  const iat = getTokenIssuedAt(accessToken);
  if (iat === null) return null;
  return Math.round(nowMs / 1000 - iat);
}

export function hasClockSkew(accessToken: string, nowMs = realNow()): boolean {
  const skew = getClockSkewSeconds(accessToken, nowMs);
  return skew !== null && Math.abs(skew) > MAX_CLOCK_SKEW_SECONDS;
}

function installCorrectedDate() {
  if (installed || typeof globalThis === "undefined") return;
  installed = true;
  class CorrectedDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(realNow() + offsetMs);
      else super(...(args as [string | number | Date]));
    }
    static now() {
      return realNow() + offsetMs;
    }
  }
  (globalThis as { Date: DateConstructor }).Date = CorrectedDate as unknown as DateConstructor;
}

export function getClockOffsetMs() {
  return offsetMs;
}

function applyOffset(next: number) {
  offsetMs = next;
  if (next !== 0) installCorrectedDate();
  try {
    if (next === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* storage unavailable */
  }
}

/** Load a previously measured offset before the auth client restores its session. */
export function initClockCorrection() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored !== 0) applyOffset(stored);
  } catch {
    /* storage unavailable */
  }
}

/** Re-measure the device clock against a fresh server token. Returns the skew in seconds. */
export function syncClockFromToken(accessToken: string): number | null {
  const skew = getClockSkewSeconds(accessToken);
  if (skew === null) return null;
  applyOffset(Math.abs(skew) > MAX_CLOCK_SKEW_SECONDS ? -skew * 1000 : 0);
  return skew;
}
