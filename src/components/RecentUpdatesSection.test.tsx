import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import RecentUpdatesSection from "./RecentUpdatesSection";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));

it("ignores an older public refresh after the latest release order has loaded", async () => {
  let finishOld: ((result: { data: unknown[]; error: null }) => void) | undefined;
  let reads = 0;
  mocks.from.mockImplementation((table: string) => {
    const chain = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
      range: vi.fn(() => {
        if (table === "featured_episodes") {
          reads++;
          if (reads === 1) return new Promise(resolve => { finishOld = resolve; });
          return Promise.resolve({ data: [{ id: "new", content_id: "new-title", episode_id: null, position: 0 }], error: null });
        }
        return Promise.resolve({ data: [
          { id: "new-title", title: "Latest release", section: "filmes", is_archived: false },
          { id: "old-title", title: "Old release", section: "filmes", is_archived: false },
        ], error: null });
      }),
    };
    return chain;
  });
  const { rerender } = render(<MemoryRouter><RecentUpdatesSection revision={0} /></MemoryRouter>);
  rerender(<MemoryRouter><RecentUpdatesSection revision={1} /></MemoryRouter>);
  await screen.findByRole("heading", { name: "Latest release" });
  await act(async () => { finishOld?.({ data: [{ id: "old", content_id: "old-title", episode_id: null, position: 0 }], error: null }); });
  expect(screen.getByRole("heading", { name: "Latest release" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Old release" })).not.toBeInTheDocument();
});