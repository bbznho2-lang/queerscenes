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
  it("finds and saves S3E1 from beyond the first thousand episodes", async () => {
    render(<FeaturedEpisodesAdmin />);
    fireEvent.change(screen.getByPlaceholderText("Type to search..."), { target: { value: "Yellow Jackets s3 ep1" } });
    fireEvent.click(await screen.findByRole("button", { name: /Yellow Jackets.*S3E1/ }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith({ episode_id: "episode-1000", content_id: null, position: 0 }));
  });
});