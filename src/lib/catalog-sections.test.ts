import { describe, expect, it } from "vitest";
import { isPublicCatalogContent, isRetiredCatalogSection } from "./catalog-sections";

describe("retired catalog categories", () => {
  it("blocks archived series even in a remaining catalog section", () => {
    expect(isPublicCatalogContent({ section: "exclusivos", is_archived: true })).toBe(false);
    expect(isPublicCatalogContent({ section: "exclusivos", is_archived: false })).toBe(true);
  });
  it("does not merge retired season records into active series", () => {
    expect(isPublicCatalogContent({ section: "gl", is_archived: false })).toBe(false);
    expect(isPublicCatalogContent({ section: "bl", is_archived: false })).toBe(false);
  });
  it("excludes GL content", () => {
    expect(isRetiredCatalogSection("gl")).toBe(true);
    expect(isRetiredCatalogSection(" GL ")).toBe(true);
  });
  it("excludes BL content", () => {
    expect(isRetiredCatalogSection("bl")).toBe(true);
    expect(isRetiredCatalogSection(" BL ")).toBe(true);
  });
  it("preserves the remaining sections", () => {
    for (const section of ["series", "filmes", "novelas", "realities", "exclusivos"]) {
      expect(isRetiredCatalogSection(section)).toBe(false);
    }
  });
});