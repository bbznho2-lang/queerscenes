import { supabase } from "@/integrations/supabase/client";
import { loadAllPages } from "@/lib/load-all-pages";

export const loadAdminEpisodes = (contentId: string) => loadAllPages((from, to) =>
  supabase.rpc("admin_get_episodes", { _content_id: contentId }).order("season").order("episode_number").order("id").range(from, to),
);