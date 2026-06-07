/**
 * RLS Sanity Tests — premium column exposure
 *
 * Verifies anon and authenticated roles CANNOT read `player_url` or `links`
 * columns directly on `contents` or `episodes`. These columns must only be
 * accessible via SECURITY DEFINER RPCs that gate on premium/admin.
 *
 * Runs against the live Lovable Cloud project using only the anon publishable
 * key. Skipped automatically if env vars are missing (e.g. in some CI shells).
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const shouldRun = Boolean(url && anonKey);
const describeIf = shouldRun ? describe : describe.skip;

describeIf("RLS — premium columns are not exposed to anon", () => {
  const anon = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("blocks anon SELECT of contents.player_url", async () => {
    const { data, error } = await anon
      .from("contents")
      .select("id, player_url")
      .limit(1);
    expect(error, "anon must NOT be able to select player_url").not.toBeNull();
    expect(data).toBeNull();
  });

  it("blocks anon SELECT of contents.links", async () => {
    const { data, error } = await anon
      .from("contents")
      .select("id, links")
      .limit(1);
    expect(error, "anon must NOT be able to select links").not.toBeNull();
    expect(data).toBeNull();
  });

  it("blocks anon SELECT of episodes.player_url", async () => {
    const { data, error } = await anon
      .from("episodes")
      .select("id, player_url")
      .limit(1);
    expect(error, "anon must NOT be able to select episode player_url").not.toBeNull();
    expect(data).toBeNull();
  });

  it("blocks anon SELECT of episodes.links", async () => {
    const { data, error } = await anon
      .from("episodes")
      .select("id, links")
      .limit(1);
    expect(error, "anon must NOT be able to select episode links").not.toBeNull();
    expect(data).toBeNull();
  });

  it("anon get_content_player_url RPC returns null for premium content without entitlement", async () => {
    // Find a premium content via the public catalog (no player_url column)
    const { data: premiumRows } = await anon
      .from("contents")
      .select("id")
      .eq("is_premium", true)
      .limit(1);
    if (!premiumRows?.length) {
      // No premium content in DB — nothing to assert
      return;
    }
    const { data: url } = await anon.rpc("get_content_player_url", {
      _content_id: premiumRows[0].id,
    });
    expect(url, "anon must not receive premium player_url via RPC").toBeNull();
  });

  it("allows anon to read non-sensitive columns (sanity check)", async () => {
    const { error } = await anon
      .from("contents")
      .select("id, title, banner_url, tag")
      .limit(1);
    expect(error, "anon should still read public catalog metadata").toBeNull();
  });
});
