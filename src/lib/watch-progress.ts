import { supabase } from "@/integrations/supabase/client";

export interface WatchProgressRow {
  content_id: string;
  episode_id: string | null;
  season: number | null;
  episode_number: number | null;
  updated_at: string;
}

/**
 * Records (or refreshes) that the signed-in user started watching a title.
 * One row per user + title — always pointing at the last opened episode.
 */
export async function saveWatchProgress(params: {
  userId: string;
  contentId: string;
  episodeId?: string | null;
  season?: number | null;
  episodeNumber?: number | null;
}) {
  const { userId, contentId, episodeId = null, season = null, episodeNumber = null } = params;
  if (!userId || !contentId) return;

  try {
    await (supabase as any)
      .from("watch_progress")
      .upsert(
        {
          user_id: userId,
          content_id: contentId,
          episode_id: episodeId,
          season,
          episode_number: episodeNumber,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,content_id" },
      );
  } catch {
    // Progress tracking must never break playback.
  }
}

export async function removeWatchProgress(userId: string, contentId: string) {
  if (!userId || !contentId) return;
  try {
    await (supabase as any)
      .from("watch_progress")
      .delete()
      .eq("user_id", userId)
      .eq("content_id", contentId);
  } catch {
    // ignore
  }
}
