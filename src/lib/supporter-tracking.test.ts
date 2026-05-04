import { describe, it, expect, vi } from "vitest";
import { trackSupporterEvent } from "./supporter-tracking";

function makeMockSupabase() {
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn(() => ({ insert }));
  return { client: { from } as any, from, insert };
}

describe("trackSupporterEvent", () => {
  it("records paywall_view with the supporter_player source", async () => {
    const { client, from, insert } = makeMockSupabase();
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
      user_id: "user-1",
      content_id: "content-1",
    });
    expect(result.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("supporter_events");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "paywall_view",
        source: "supporter_player",
        user_id: "user-1",
        content_id: "content-1",
      }),
    );
  });

  it("records become_supporter_click with the originating paywall source", async () => {
    const { client, insert } = makeMockSupabase();
    await trackSupporterEvent(client, {
      event_type: "become_supporter_click",
      source: "paywall_supporter_player",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "become_supporter_click",
        source: "paywall_supporter_player",
      }),
    );
  });

  it("records locked_content_view with the premium_content source", async () => {
    const { client, insert } = makeMockSupabase();
    await trackSupporterEvent(client, {
      event_type: "locked_content_view",
      source: "premium_content",
      content_id: "abc",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "locked_content_view",
        source: "premium_content",
        content_id: "abc",
      }),
    );
  });

  it("returns ok=false when the insert fails but does not throw", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = { from: vi.fn(() => ({ insert })) } as any;
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
    });
    expect(result.ok).toBe(false);
  });

  it("never throws when supabase rejects", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("network"));
    const client = { from: vi.fn(() => ({ insert })) } as any;
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
    });
    expect(result.ok).toBe(false);
  });
});
