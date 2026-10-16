/**
 * Advertising consent handling.
 *
 * Visitors in regions that require consent (EEA, UK, CH, BR) start denied and
 * only move to "granted" after an explicit choice in the cookie banner.
 * Everywhere else advertising measurement is enabled by default, and the
 * visitor can still refuse it from Cookie settings.
 */

export type AdConsentChoice = "granted" | "denied";

export const CONSENT_NOTICE_VERSION = "2026-10-16-v1";

export const CONSENT_NOTICE_TEXT =
  "We use cookies and similar technology to measure how our advertising performs. " +
  "Data about your visit (page interactions, anonymous visitor id, IP address and browser) " +
  "is shared with TikTok for advertising measurement and optimization when you accept. " +
  "You can change or withdraw your choice at any time in Cookie settings.";

export interface ConsentRecord {
  advertising: AdConsentChoice;
  decided_at: string;
  notice_version: string;
  region: string;
  /** Preserved evidence of an earlier acceptance, if the visitor later withdrew. */
  previously_granted_at?: string;
}

const STORAGE_KEY = "qs_consent_v1";
const CONSENT_REGION_PREFIXES = [
  // EEA
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","IS",
  // UK, Switzerland, Brazil
  "GB","CH","BR",
];

export const CONSENT_CHANGED_EVENT = "qs-consent-changed";

export function readConsentRecord(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed?.advertising !== "granted" && parsed?.advertising !== "denied") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsentChoice(choice: AdConsentChoice, region: string): ConsentRecord {
  const previous = readConsentRecord();
  const record: ConsentRecord = {
    advertising: choice,
    decided_at: new Date().toISOString(),
    notice_version: CONSENT_NOTICE_VERSION,
    region,
    previously_granted_at:
      previous?.advertising === "granted"
        ? previous.decided_at
        : previous?.previously_granted_at,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable — choice applies to this page view only */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
  return record;
}

let regionPromise: Promise<string> | null = null;

/** Visitor country from the same-origin Cloudflare trace. "XX" when unknown. */
export function getVisitorRegion(): Promise<string> {
  if (regionPromise) return regionPromise;
  regionPromise = (async () => {
    if (typeof window === "undefined") return "XX";
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("/cdn-cgi/trace", { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return "XX";
      const text = await res.text();
      const match = text.match(/^loc=([A-Z0-9]{2})$/m);
      const loc = match?.[1];
      if (!loc || loc === "XX" || loc === "T1") return "XX";
      return loc;
    } catch {
      return "XX";
    }
  })();
  return regionPromise;
}

/** Unknown regions are treated as consent-required. */
export function regionRequiresConsent(region: string): boolean {
  if (!region || region === "XX") return true;
  return CONSENT_REGION_PREFIXES.includes(region);
}

/** Current advertising permission, read fresh on every send. */
export function hasAdvertisingConsent(): boolean {
  const record = readConsentRecord();
  if (record) return record.advertising === "granted";
  return lastKnownRegionRequiresConsent === false;
}

let lastKnownRegionRequiresConsent: boolean | null = null;

export function setRegionConsentRequirement(required: boolean) {
  lastKnownRegionRequiresConsent = required;
}

export function getRegionConsentRequirement(): boolean | null {
  return lastKnownRegionRequiresConsent;
}
