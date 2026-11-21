import { describe, expect, it } from "vitest";
import { nextFeaturedPosition, reorderFeatured } from "./featured-order";

describe("Recent Updates release order", () => {
  it("moves a release even when adjacent stored positions are equal", () => {
    const releases = [{ id: "body", position: 3 }, { id: "yellow", position: 4 }, { id: "motherland", position: 4 }, { id: "sister", position: 4 }];
    expect(reorderFeatured(releases, 2, 1).map(item => item.id)).toEqual(["body", "motherland", "yellow", "sister"]);
    expect(releases[1].id).toBe("yellow");
  });
  it("appends after the highest position, not the number of releases", () => {
    expect(nextFeaturedPosition([{ position: 3 }, { position: 4 }, { position: 4 }, { position: 4 }, { position: 5 }])).toBe(6);
    expect(nextFeaturedPosition([])).toBe(0);
  });
});