import { describe, expect, it } from "vitest";
import { isRetiredCatalogSection } from "./catalog-sections";

describe("retired catalog categories", () => {
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