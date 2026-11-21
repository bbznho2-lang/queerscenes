import { describe, expect, it, vi } from "vitest";
import { loadAdminEpisodes } from "./admin-episodes";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));

describe("complete admin episode loading", () => {
  it("loads all seasons for editing and copying, including chapters past row 1,000", async () => {
    const episodes = Array.from({ length: 1001 }, (_, id) => ({ id, season: id === 1000 ? 2 : 1 }));
    const range = vi.fn(async (from: number, to: number) => ({ data: episodes.slice(from, to + 1), error: null }));
    const builder = { order: vi.fn().mockReturnThis(), range };
    mocks.rpc.mockReturnValue(builder);
    const result = await loadAdminEpisodes("series-id");
    expect(result).toHaveLength(1001);
    expect(result[1000]).toEqual({ id: 1000, season: 2 });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_get_episodes", { _content_id: "series-id" });
    expect(range).toHaveBeenLastCalledWith(1000, 1499);
  });
});