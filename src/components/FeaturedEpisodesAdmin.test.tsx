import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FeaturedEpisodesAdmin from "./FeaturedEpisodesAdmin";

const mocks = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.error } }));

beforeEach(() => {
  vi.clearAllMocks();
  const episodes = Array.from({ length: 1028 }, (_, id) => ({
    id: `episode-${id}`, title: `Episode ${id}`, content_id: "series", season: id >= 1000 ? 3 : 1, episode_number: id >= 1000 ? id - 999 : id + 1,
  }));
  mocks.insert.mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    const rows = table === "episodes" ? episodes : table === "contents"
      ? [{ id: "series", title: "Yellow Jackets", type: "serie", section: "series" }] : [];
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      range: vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null })), insert: mocks.insert };
    return chain;
  });
});

describe("Recent Updates new seasons", () => {
  it("saves a changed order when two releases have the same position", async () => {
    const rows = [
      { id: "first", content_id: "a", episode_id: null, position: 4 },
      { id: "second", content_id: "b", episode_id: null, position: 4 },
    ];
    const saved: { id: string; position: number }[] = [];
    mocks.from.mockImplementation((table: string) => {
      const data = table === "contents" ? [{ id: "a", title: "First release", type: "filme", section: "filmes" }, { id: "b", title: "Second release", type: "filme", section: "filmes" }] : table === "featured_episodes" ? rows : [];
      let update: { position: number } | undefined;
      let id = "";
      const chain = {
        select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        eq: vi.fn((key: string, value: string) => { if (key === "id") id = value; return chain; }),
        range: vi.fn(async () => ({ data, error: null })),
        update: vi.fn((value: { position: number }) => { update = value; return chain; }),
        single: vi.fn(async () => {
          if (update) {
            saved.push({ id, position: update.position });
            const row = rows.find(row => row.id === id);
            if (row) row.position = update.position;
          }
          rows.sort((a, b) => a.position - b.position);
          return { data: { id }, error: null };
        }),
      };
      return chain;
    });
    const changed = vi.fn();
    render(<FeaturedEpisodesAdmin onChanged={changed} />);
    fireEvent.click(await screen.findByRole("button", { name: "Move Second release up" }));
    await waitFor(() => expect(changed).toHaveBeenCalled());
    expect(saved).toEqual([{ id: "second", position: 0 }, { id: "first", position: 1 }]);
    expect(rows.map(row => row.id)).toEqual(["second", "first"]);
  });

  it("finds and saves S3E1 from beyond the first thousand episodes", async () => {
    render(<FeaturedEpisodesAdmin />);
    fireEvent.change(screen.getByPlaceholderText("Type to search..."), { target: { value: "Yellow Jackets s3 ep1" } });
    fireEvent.click(await screen.findByRole("button", { name: /Yellow Jackets.*S3E1/ }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith({ episode_id: "episode-1000", content_id: null, position: 0 }));
  });
});