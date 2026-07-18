import { describe, it, expect, vi } from "vitest";
import { trackSupporterEvent } from "./supporter-tracking";

function makeMockSupabase() {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  return { client: { rpc } as any, rpc };
}

describe("trackSupporterEvent", () => {
  it("records paywall_view with the supporter_player source", async () => {
    const { client, rpc } = makeMockSupabase();
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
      user_id: "user-1",
      content_id: "content-1",
    });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "log_supporter_event",
      expect.objectContaining({
        _event_type: "paywall_view",
        _source: "supporter_player",
        _content_id: "content-1",
      }),
    );
  });

  it("records become_supporter_click with the originating paywall source", async () => {
    const { client, rpc } = makeMockSupabase();
    await trackSupporterEvent(client, {
      event_type: "become_supporter_click",
      source: "paywall_supporter_player",
    });
    expect(rpc).toHaveBeenCalledWith(
      "log_supporter_event",
      expect.objectContaining({
        _event_type: "become_supporter_click",
        _source: "paywall_supporter_player",
      }),
    );
  });

  it("records locked_content_view with the premium_content source", async () => {
    const { client, rpc } = makeMockSupabase();
    await trackSupporterEvent(client, {
      event_type: "locked_content_view",
      source: "premium_content",
      content_id: "abc",
    });
    expect(rpc).toHaveBeenCalledWith(
      "log_supporter_event",
      expect.objectContaining({
        _event_type: "locked_content_view",
        _source: "premium_content",
        _content_id: "abc",
      }),
    );
  });

  it("returns ok=false when the insert fails but does not throw", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const client = { rpc } as any;
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
    });
    expect(result.ok).toBe(false);
  });

  it("never throws when supabase rejects", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("network"));
    const client = { rpc } as any;
    const result = await trackSupporterEvent(client, {
      event_type: "paywall_view",
      source: "supporter_player",
    });
    expect(result.ok).toBe(false);
  });
});
