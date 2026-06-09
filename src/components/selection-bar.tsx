import { useMemo } from "react";
import {
  RiCloseLine,
  RiInboxArchiveLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { SelectionStack } from "@/components/selection-stack";
import { useBookmarks } from "@/contexts/bookmarks-context";
import { useHidden } from "@/contexts/hidden-context";
import { useSelection } from "@/contexts/selection-context";
import { useTab } from "@/contexts/tab-context";

export function SelectionBar() {
  const { selectedIds, clear } = useSelection();
  const { byId } = useBookmarks();
  const { archive, restore } = useHidden();
  const { activeTab } = useTab();
  const restoring = activeTab === "archive";

  // Selection (click) order. `selectedIds` is a Set that preserves insertion
  // order, so the most-recently-selected id is always last — which is what
  // SelectionStack requires: a new card must append to the tail to slide in
  // from the right. Walking byId instead re-sorts by load order, which makes
  // the stack reshuffle ("flip back") or skip animating when you select out of
  // list order. Filter to ids with a loaded bookmark so the rendered stack
  // width matches what can actually draw.
  const orderedIds = useMemo(
    () => [...selectedIds].filter((id) => byId.has(id)),
    [selectedIds, byId]
  );

  if (selectedIds.size === 0) return null;

  return (
    <div className="pointer-events-none sticky bottom-4 z-50 mx-auto flex w-full max-w-[600px] px-3">
      <div className="bg-card text-card-foreground pointer-events-auto flex h-[52px] w-full items-center gap-3.5 rounded-lg border py-3 pr-3 pl-3.5 shadow-lg">
        <SelectionStack ids={orderedIds} byId={byId} />
        <span className="flex-1 text-sm tabular-nums whitespace-nowrap">
          {selectedIds.size} selected
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const ids = [...selectedIds];
              if (restoring) restore(ids);
              else archive(ids);
              clear();
            }}
          >
            {restoring ? <RiInboxUnarchiveLine /> : <RiInboxArchiveLine />}
            <span>{restoring ? "Restore" : "Archive"}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            aria-label="Clear selection"
          >
            <RiCloseLine />
          </Button>
        </div>
      </div>
    </div>
  );
}
