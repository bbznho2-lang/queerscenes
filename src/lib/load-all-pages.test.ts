import { describe, expect, it, vi } from "vitest";
import { loadAllPages } from "./load-all-pages";

describe("complete catalog loading", () => {
  it("includes new seasons beyond the first 1,000 episodes", async () => {
    const episodes = Array.from({ length: 1028 }, (_, id) => ({ id, season: id >= 1000 ? 3 : 1 }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({ data: episodes.slice(from, to + 1), error: null }));
    const result = await loadAllPages(fetchPage);
    expect(result).toHaveLength(1028);
    expect(result.filter(ep => ep.season === 3)).toHaveLength(28);
    expect(fetchPage).toHaveBeenLastCalledWith(1000, 1499);
  });
  it("does not treat a failed later page as a complete catalog", async () => {
    await expect(loadAllPages(async from => from === 0
      ? { data: Array.from({ length: 500 }, (_, id) => id), error: null }
      : { data: null, error: { message: "Connection failed" } })).rejects.toThrow("Connection failed");
  });
});