export function reorderFeatured<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const ordered = [...items];
  const [item] = ordered.splice(from, 1);
  ordered.splice(to, 0, item);
  return ordered;
}

export function nextFeaturedPosition(items: { position: number }[]): number {
  return items.length ? Math.max(...items.map(item => item.position)) + 1 : 0;
}