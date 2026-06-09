import type { Bookmark } from "@/types/bookmark";

// Sentinel value used by the category filter's "Uncategorized" option.
// Anything that's not a real ft category slug works; the filter treats this
// value as "bookmarks with no categories and no primary_category".
export const UNCLASSIFIED_CATEGORY = "__unclassified__";

// Aggregate counts across visible (non-hidden) bookmarks. Counts each bookmark
// once per *distinct* category in its list, so a bookmark tagged
// `"tool,security"` adds 1 to both "tool" and "security" — mirrors how
// `ft list --category` matches (permissive across the full list).
export function getCategoryCounts(
  bookmarks: readonly Bookmark[],
  hiddenIds: ReadonlySet<string>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bookmarks) {
    if (hiddenIds.has(b.id)) continue;
    for (const c of b.categories) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }
  return counts;
}

// Count of bookmarks with no categories at all (what `ft classify` would
// treat as unclassified). Used to label the "Uncategorized" filter row.
export function getUnclassifiedCount(
  bookmarks: readonly Bookmark[],
  hiddenIds: ReadonlySet<string>,
): number {
  let n = 0;
  for (const b of bookmarks) {
    if (hiddenIds.has(b.id)) continue;
    if (b.categories.length === 0 && !b.primary_category) n++;
  }
  return n;
}
