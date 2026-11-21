import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe("selected security regressions", () => {
  it("forces new requests pending without changing settled requests", () => {
    const sql = readFileSync("drizzle/migrations/0015_protect_selected_membership_and_request_functions.sql", "utf8");
    expect(sql).toContain("NEW.status := 'pending'");
    expect(sql).toContain("NEW.admin_reply := NULL");
    expect(sql).toContain("BEFORE INSERT ON public.title_requests");
    expect(sql).not.toMatch(/UPDATE public.title_requests/i);
  });

  it("does not publish email-derived names", () => {
    const sql = readFileSync("drizzle/migrations/0015_protect_selected_membership_and_request_functions.sql", "utf8");
    expect(sql).toContain("'Anonymous'");
    expect(sql).not.toContain("r.email");
    const comments = readFileSync("src/components/CommentsSection.tsx", "utf8");
    expect(comments).not.toContain('rpc("get_supporter_user_ids"');
  });
});

describe.skipIf(!url || !key)("selected public access restrictions", () => {
  const anon = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  it("denies legacy chat reads without a session", async () => {
    const { error } = await anon.rpc("list_support_chat_messages", { _chat_id: "00000000-0000-0000-0000-000000000001", _token: "invalid" });
    expect(error).not.toBeNull();
  });
  it("denies anonymous membership lookup", async () => {
    const { error } = await anon.rpc("get_supporter_user_ids", { _user_ids: ["00000000-0000-0000-0000-000000000001"] });
    expect(error).not.toBeNull();
  });
  it("keeps public wishlist readable without contact fields", async () => {
    const { data, error } = await anon.rpc("list_public_title_requests", { _limit: 1 });
    expect(error).toBeNull();
    for (const row of data || []) {
      expect(row).not.toHaveProperty("email");
      expect(row).not.toHaveProperty("user_id");
    }
  });
});