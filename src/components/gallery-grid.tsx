import { CopyableCode } from "@/components/copyable-code";
import { GalleryList } from "@/components/gallery-list";
import { StatusMessage } from "@/components/status-message";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useFilter } from "@/contexts/filter-context";
import { useGalleryZoom } from "@/contexts/gallery-zoom-context";
import { useHidden } from "@/contexts/hidden-context";
import { useSettings } from "@/contexts/settings-context";
import { useFilteredGallery } from "@/hooks/use-filtered-gallery";

export function GalleryGrid() {
  const { bookmarks, error, loading } = useBookmarks();
  const { state: filterState } = useFilter();
  const { hiddenIds } = useHidden();
  const { settings } = useSettings();
  const items = useFilteredGallery();
  const { zoomWidth } = useGalleryZoom();

  if (loading) {
    return (
      <StatusMessage>Loading bookmarks…</StatusMessage>
    );
  }
  if (error) {
    return (
      <StatusMessage variant="destructive">{error.message}</StatusMessage>
    );
  }
  // States 1+2 combined: no bookmarks at all. Same copy as bookmark-grid.tsx.
  if (!bookmarks || bookmarks.length === 0) {
    return (
      <StatusMessage>
        <p className="text-foreground">No local data.</p>
        <p className="mt-1">
          Click Sync in the sidebar to fetch bookmarks (and media unless
          Skip media is on in Settings).
        </p>
        <p className="mt-1">
          Or run <CopyableCode value="ft sync" /> in your terminal.
        </p>
      </StatusMessage>
    );
  }
  if (items.length === 0) {
    const hasFilters =
      filterState.accounts.size > 0 ||
      filterState.types.size > 0 ||
      filterState.categories.size > 0 ||
      filterState.languages.size > 0 ||
      filterState.color !== null ||
      filterState.search !== "";

    if (hasFilters) {
      return (
        <StatusMessage>No media match the current filters.</StatusMessage>
      );
    }
    // No filters — either everything is archived (gallery hides archived),
    // hideUnfetched is hiding everything, or visible bookmarks have no media.
    const visibleCount = bookmarks.filter((b) => !hiddenIds.has(b.id)).length;
    if (visibleCount === 0) {
      return (
        <StatusMessage>
          <p className="text-foreground">
            All bookmarks archived ({bookmarks.length.toLocaleString()}).
          </p>
          <p className="mt-1">Open Archive to view them.</p>
        </StatusMessage>
      );
    }
    if (settings.hideUnfetched) {
      return (
        <StatusMessage>
          <p className="text-foreground">No fetched media.</p>
          <p className="mt-1">
            Disable <em>Hide unfetched media</em> in Settings, or run{" "}
            <CopyableCode value="ft fetch-media" />.
          </p>
        </StatusMessage>
      );
    }
    return (
      <StatusMessage>
        <p className="text-foreground">No media in your bookmarks.</p>
        <p className="mt-1">Gallery shows images, videos, and GIFs.</p>
      </StatusMessage>
    );
  }

  return <GalleryList items={items} columnWidth={zoomWidth} />;
}
