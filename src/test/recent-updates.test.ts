import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!sessionJson || !url || !key)("automatic Recent Updates", () => {
  it.each(["serie", "filme"])("features a newly added %s automatically, once", async type => {
    if (!sessionJson || !url || !key) throw new Error("Missing test session");
    const session = JSON.parse(sessionJson);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
    const ids: string[] = [];
    try {
      const title = `Recent Updates test ${type} ${crypto.randomUUID()}`;
      const { data: first, error } = await client.from("contents").insert({ title, type, section: type === "filme" ? "filmes" : "series", year: 2026, tag: "Drama" }).select("id").single();
      if (error || !first) throw error || new Error("Title not created");
      ids.push(first.id);
      const { data: featured, error: readError } = await client.from("featured_episodes").select("content_id,episode_id").eq("content_id", first.id);
      expect(readError).toBeNull();
      expect(featured).toEqual([{ content_id: first.id, episode_id: null }]);
      const { data: duplicate, error: duplicateError } = await client.from("contents").insert({ title, type, section: "exclusivos", year: 2026, tag: "Drama" }).select("id").single();
      if (duplicateError || !duplicate) throw duplicateError || new Error("Copy not created");
      ids.push(duplicate.id);
      const { data: duplicateFeatured } = await client.from("featured_episodes").select("id").eq("content_id", duplicate.id);
      expect(duplicateFeatured).toEqual([]);
    } finally {
      if (ids.length) {
        await client.from("featured_episodes").delete().in("content_id", ids);
        await client.from("contents").delete().in("id", ids);
      }
    }
  });
});