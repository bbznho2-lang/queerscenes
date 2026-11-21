import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddExistingContentDialog from "./AddExistingContentDialog";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { ...mocks, rpc: (...args: unknown[]) => {
  const request = mocks.rpc(...args);
  const builder = Object.assign(request, {
    order: () => builder,
    range: async (from: number, to: number) => {
      const result = await request;
      return { ...result, data: result.data?.slice(from, to + 1) ?? null };
    },
  });
  return builder;
} } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
const url = "https://example.com/new-video";
const item = { id: "original", title: "Series copy test", year: 2026, tag: "Drama", type: "serie", section: "series", banner_url: null, player_url: null, links: [] };
const episode = { id: "episode", content_id: item.id, title: "Episode 1", episode_number: 1, season: 1, is_premium: true, player_url: url, links: [{ title: "Watch", type: "embed", url }] };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation((name: string) => Promise.resolve({ data: name === "admin_get_episodes" ? [episode] : [item], error: null }));
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [] }), neq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [item] }) };
  mocks.insert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "copy" }, error: null }) }), error: null });
  mocks.from.mockReturnValue({ ...chain, insert: mocks.insert });
});
const selectAndSave = async () => {
  fireEvent.click(await screen.findByText(item.title));
  fireEvent.click(screen.getByRole("button", { name: "Adicionar (1)" }));
};
describe("copying current playback links", () => {
  it("copies the current episode URL and link list into Exclusives", async () => {
    render(<AddExistingContentDialog open targetSection="exclusivos" onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    await selectAndSave();
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.insert).toHaveBeenLastCalledWith([expect.objectContaining({ content_id: "copy", player_url: url, links: episode.links })]);
  });
  it("does not create a copy or report success when episode links fail to load", async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "admin_get_episodes" ? { data: null, error: { message: "Could not read episode links" } } : { data: [item], error: null }));
    const onSaved = vi.fn();
    render(<AddExistingContentDialog open targetSection="exclusivos" onOpenChange={vi.fn()} onSaved={onSaved} />);
    await selectAndSave();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Could not read episode links"));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});