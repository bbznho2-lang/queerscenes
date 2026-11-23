/** Retired categories must not reappear in catalog surfaces or old player links. */
export const isRetiredCatalogSection = (section?: string | null): boolean =>
  ["gl", "bl"].includes((section ?? "").trim().toLowerCase());

/** Archived titles are unavailable publicly, including duplicate season records. */
export const isPublicCatalogContent = (content: { section?: string | null; is_archived?: boolean | null }): boolean =>
  !content.is_archived && !isRetiredCatalogSection(content.section);