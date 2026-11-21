import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditContentDialog from "./EditContentDialog";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), success: vi.fn(), error: vi.fn(), single: vi.fn(), update: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
const oldUrl = "https://example.com/old-video";
const newUrl = "https://example.com/new-video";
const content = { id: "title-1", title: "Series test", year: 2026, tag: "Drama", type: "serie", section: "series", position: 1, is_premium: true, banner_url: null, player_url: oldUrl };
const episode = { id: "ep-1", content_id: content.id, title: "Episode 1", season: 1, episode_number: 1, player_url: oldUrl, is_premium: true, links: [{ title: "Watch", type: "embed", url: oldUrl }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation((name: string) => Promise.resolve({ data: name === "admin_get_episodes" ? [episode] : [{ ...content, links: episode.links }], error: null }));
  mocks.single.mockResolvedValue({ data: { id: "saved" }, error: null });
  const chain = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: mocks.single };
  mocks.update.mockReturnValue(chain);
  mocks.from.mockReturnValue({ update: mocks.update });
});

describe("video link editing", () => {
  it("saves the new episode URL in both link fields", async () => {
    render(<EditContentDialog open content={content} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    const input = await screen.findByDisplayValue(oldUrl);
    fireEvent.change(input, { target: { value: newUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ player_url: newUrl, links: [{ title: "Watch", type: "embed", url: newUrl }] }));
  });

  it("does not report success or close when an episode update fails", async () => {
    mocks.single.mockResolvedValueOnce({ data: { id: content.id }, error: null }).mockResolvedValueOnce({ data: null, error: { message: "Episode save denied" } });
    const onSaved = vi.fn();
    const close = vi.fn();
    render(<EditContentDialog open content={content} onOpenChange={close} onSaved={onSaved} />);
    fireEvent.change(await screen.findByDisplayValue(oldUrl), { target: { value: newUrl } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Episode save denied"));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue(newUrl)).toBeInTheDocument();
  });

  it("clears the legacy movie URL when the last link is removed", async () => {
    render(<EditContentDialog open content={{ ...content, type: "filme" }} onOpenChange={vi.fn()} onSaved={vi.fn()} />);
    const input = await screen.findByDisplayValue(oldUrl);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ player_url: null, links: [] }));
  });
});