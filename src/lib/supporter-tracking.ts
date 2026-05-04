import type { SupabaseClient } from "@supabase/supabase-js";

export type SupporterEventType =
  | "paywall_view"
  | "locked_content_view"
  | "become_supporter_click"
  | "supporter_player_click"
  | "paywall_signup_click"
  | "paywall_signup_submit"
  | "watch_free_fallback_click";

export interface TrackSupporterEventParams {
  event_type: SupporterEventType;
  source: string;
  user_id?: string | null;
  content_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Inserts a supporter conversion event. Non-throwing — failures are swallowed
 * so analytics never block the UI.
 */
export async function trackSupporterEvent(
  supabase: Pick<SupabaseClient, "from">,
  params: TrackSupporterEventParams,
): Promise<{ ok: boolean; error?: unknown }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.from as any)("supporter_events").insert({
      user_id: params.user_id ?? null,
      content_id: params.content_id ?? null,
      event_type: params.event_type,
      source: params.source,
      metadata: params.metadata ?? null,
    });
    if (result && (result as { error?: unknown }).error) {
      return { ok: false, error: (result as { error?: unknown }).error };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
