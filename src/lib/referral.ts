import { supabase } from "@/integrations/supabase/client";
import { getFunnelVisitorId } from "@/lib/supporter-tracking";

const STORAGE_KEY = "qs_ref_code";
const COOKIE_KEY = "qs_ref";
const COOKIE_DAYS = 30;

export function normalizeRefCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
  return clean.length ? clean : null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** Referral code currently attributed to this visitor (localStorage or cookie). */
export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeRefCode(window.localStorage.getItem(STORAGE_KEY) || readCookie(COOKIE_KEY));
}

export function storeReferralCode(code: string) {
  const clean = normalizeRefCode(code);
  if (!clean) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, clean);
  } catch {
    /* ignore */
  }
  writeCookie(COOKIE_KEY, clean, COOKIE_DAYS);
}

/**
 * Reads `?ref=` from the URL, persists it for 30 days and logs a "click" event.
 * Safe to call on every page load — never throws.
 */
export async function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const code = normalizeRefCode(new URLSearchParams(window.location.search).get("ref"));
    if (!code) return;

    const alreadyStored = getReferralCode();
    storeReferralCode(code);

    // Log one click per session per code to avoid spam on refresh.
    const sessionKey = `qs_ref_click_${code}`;
    if (window.sessionStorage.getItem(sessionKey)) return;
    window.sessionStorage.setItem(sessionKey, "1");

    await (supabase as any).from("referral_events").insert({
      ref_code: code,
      event_type: "click",
      visitor_id: getFunnelVisitorId(),
      metadata: {
        landing_path: window.location.pathname,
        returning: alreadyStored === code,
        referrer: document.referrer || null,
      },
    });
  } catch {
    /* analytics must never break the app */
  }
}

export function buildReferralUrl(code: string) {
  const clean = normalizeRefCode(code);
  return clean ? `https://queerscenes.com/?ref=${clean}` : "";
}

export function maskEmail(email: string | null | undefined) {
  if (!email) return "unknown";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}
