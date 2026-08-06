import type { SupabaseClient } from "@supabase/supabase-js";

export type SupporterEventType =
  | "paywall_view"
  | "locked_content_view"
  | "become_supporter_click"
  | "supporter_player_click"
  | "paywall_signup_click"
  | "paywall_signup_submit"
  | "checkout_session_created"
  | "checkout_completed"
  | "watch_free_fallback_click";

export interface TrackSupporterEventParams {
  event_type: SupporterEventType;
  source: string;
  user_id?: string | null;
  content_id?: string | null;
  metadata?: Record<string, unknown>;
}

export function getFunnelVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  const key = "qs_funnel_visitor_id";
  const legacyKey = "qs_visitor_id";
  const existing = window.localStorage.getItem(key) || window.localStorage.getItem(legacyKey);
  if (existing) {
    window.localStorage.setItem(key, existing);
    return existing;
  }
  const generated = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, generated);
  window.localStorage.setItem(legacyKey, generated);
  return generated;
}

/** Referral code stored for this visitor (localStorage or 30-day cookie). */
export function getStoredRefCode(): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("qs_ref_code");
  } catch {
    raw = null;
  }
  if (!raw && typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )qs_ref=([^;]*)/);
    raw = match ? decodeURIComponent(match[1]) : null;
  }
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 60);
  return clean.length ? clean : null;
}

export function trackSupporterClick(
  supabase: Pick<SupabaseClient, "from">,
  params: Omit<TrackSupporterEventParams, "event_type">,
) {
  return trackSupporterEvent(supabase, {
    ...params,
    event_type: "become_supporter_click",
  });
}

/**
 * Inserts a supporter conversion event. Non-throwing — failures are swallowed
 * so analytics never block the UI.
 */
export async function trackSupporterEvent(
  supabase: Pick<SupabaseClient, "from"> & { rpc?: SupabaseClient["rpc"] },
  params: TrackSupporterEventParams,
): Promise<{ ok: boolean; error?: unknown }> {
  try {
    const visitorId = getFunnelVisitorId();
    const metadata = { ...(params.metadata ?? {}) };
    if (visitorId) metadata.visitor_id = visitorId;
    if (metadata.ref_code == null) {
      const refCode = getStoredRefCode();
      if (refCode) metadata.ref_code = refCode;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await ((supabase as any).rpc as any)("log_supporter_event", {
      _event_type: params.event_type,
      _source: params.source,
      _content_id: params.content_id ?? null,
      _metadata: metadata,
    });
    if (result && (result as { error?: unknown }).error) {
      return { ok: false, error: (result as { error?: unknown }).error };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
