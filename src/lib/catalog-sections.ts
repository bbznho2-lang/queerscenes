/** Retired categories must not reappear in catalog surfaces or old player links. */
export const isRetiredCatalogSection = (section?: string | null): boolean =>
  ["gl", "bl"].includes((section ?? "").trim().toLowerCase());