// X Article preview block. Rendered inside BookmarkCard when the bookmark
// links to an X Article (`x.com/i/article/<id>`) and ft enrichment has
// populated `article_title` + `article_text`. Replaces the tweet text
// section — the tweet text for X Articles is just the t.co shortener,
// which is noise once the article body is available.
//
// Layout: shadcn Badge pill ("X Article") → title (text-base semibold,
// free wrap) → body (text-sm, line-clamp-3 with browser ellipsis). The
// height predictor (compute-bookmark-height.ts) mirrors this structure.

import { RiTwitterXLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { CopyableCode } from "@/components/copyable-code";

// Pending-state message split into prefix / code / suffix so the
// CopyableCode (monospace + px-1 padding from `font-mono px-1`) renders
// inline and the predictor (compute-bookmark-height.ts) can measure the
// code segment at the correct font + width. Plain Inter measurement of
// the code text would under-count by ~30 px (monospace is wider per
// char, plus 8 px of horizontal padding from `px-1`), enough to flip a
// wrap decision at narrow card widths.
export const ARTICLE_PENDING_PREFIX =
  "Article not synced. Run Backfill Gaps from sidebar or ";
export const ARTICLE_PENDING_CODE = "ft sync --gaps";
export const ARTICLE_PENDING_SUFFIX = " in terminal";

export function ArticleBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  // `leading-none` on the outer div collapses the line-box that contains
  // the inline-flex Badge to the badge's intrinsic h-5 (20 px) instead of
  // the document's inherited 24 px. Without it, the badge sits in a 24 px
  // line-box with ~3 px of unused ascent above it and the block renders
  // 3 px taller than the predictor expects (ARTICLE_PILL_HEIGHT = 20 is
  // the design intent — keep reality matching the constant). h3 and p
  // set their own line-heights (leading-tight / text-sm) so they're
  // unaffected.
  return (
    <div className="leading-none rounded-md border p-2">
      <Badge variant="secondary" className="mb-2">
        <RiTwitterXLine />
        Article
      </Badge>
      <h3 className="text-base font-semibold leading-tight">{title}</h3>
      <p className="mt-2 line-clamp-3 text-sm">{body}</p>
    </div>
  );
}

// Rendered when a bookmark links to an X Article (`/i/article/<id>`) but
// `ft sync --gaps` hasn't populated `article_title`/`article_text` yet.
// Same chrome as ArticleBlock so it reads as a member of the same family;
// the message tells the user how to populate it (Backfill Gaps is the
// sidebar action that runs `ft sync --gaps`).
export function ArticleBlockPending() {
  return (
    <div className="leading-none rounded-md border p-2">
      <Badge variant="secondary" className="mb-2">
        <RiTwitterXLine />
        Article
      </Badge>
      <p className="text-muted-foreground text-sm">
        {ARTICLE_PENDING_PREFIX}
        <CopyableCode value={ARTICLE_PENDING_CODE} />
        {ARTICLE_PENDING_SUFFIX}
      </p>
    </div>
  );
}
