// Detects when the device clock disagrees with the server clock. A clock that is
// off by more than the token lifetime makes the auth client treat every new
// session as already expired, causing endless refreshes and a forced sign-out.
export const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export const CLOCK_SKEW_MESSAGE =
  "Your computer's date and time are not correct, so the login can't stay open. " +
  "On Windows open Settings → Time & language → Date & time, turn on \"Set time automatically\" " +
  "and \"Set time zone automatically\", click \"Sync now\", then sign in again.";

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
export function getClockSkewSeconds(accessToken: string, nowMs = Date.now()): number | null {
  const iat = getTokenIssuedAt(accessToken);
  if (iat === null) return null;
  return Math.round(nowMs / 1000 - iat);
}

export function hasClockSkew(accessToken: string, nowMs = Date.now()): boolean {
  const skew = getClockSkewSeconds(accessToken, nowMs);
  return skew !== null && Math.abs(skew) > MAX_CLOCK_SKEW_SECONDS;
}
