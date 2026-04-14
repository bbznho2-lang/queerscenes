import { supabase } from "@/integrations/supabase/client";

interface HasTitle {
  id: string;
  title: string;
}

interface TopContentRow {
  content_id: string;
  rank: number;
  clicks: number;
}

const normalizeTitle = (title: string) => title.trim().toLocaleLowerCase();

export const getUniqueItemsByTitle = <T extends HasTitle>(items: T[]) => {
  const seenTitles = new Set<string>();

  return items.filter((item) => {
    const titleKey = normalizeTitle(item.title);

    if (seenTitles.has(titleKey)) {
      return false;
    }

    seenTitles.add(titleKey);
    return true;
  });
};

export const buildUniqueTopContent = <T extends HasTitle>(items: T[], rankedIds: string[], limit = 10) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seenTitles = new Set<string>();
  const usedIds = new Set<string>();
  const result: T[] = [];

  for (const id of rankedIds) {
    const item = byId.get(id);

    if (!item) {
      continue;
    }

    const titleKey = normalizeTitle(item.title);

    if (seenTitles.has(titleKey)) {
      continue;
    }

    seenTitles.add(titleKey);
    usedIds.add(item.id);
    result.push(item);

    if (result.length === limit) {
      return result;
    }
  }

  for (const item of items) {
    if (usedIds.has(item.id)) {
      continue;
    }

    const titleKey = normalizeTitle(item.title);

    if (seenTitles.has(titleKey)) {
      continue;
    }

    seenTitles.add(titleKey);
    result.push(item);

    if (result.length === limit) {
      break;
    }
  }

  return result;
};

export const fetchTopContentRanking = async (limit = 10) => {
  const { data, error } = await supabase.rpc("get_top_content_ids", { _limit: limit });

  if (error) {
    throw error;
  }

  return (data ?? []) as TopContentRow[];
};