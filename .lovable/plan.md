## What's wrong

**1. Collages regenerate every visit (cache bug).**
The cache-validity check in `ProductGeneratedLook.tsx` (line 459/492) requires `collage_debug` entries to have `status === 'used'`:
```
const hasUsedEntries = cachedDebug.some(item => item?.status === 'used');
const collageStale = ... || !hasUsedEntries;
```
But the edge function actually writes `status: "cache_hit"` (confirmed by querying the DB — every cached collage I inspected has `cache_hit`, never `used`). So every cached collage is flagged stale → regenerated → re-cached with `cache_hit` again → regenerated again next visit. Identical loop.

**2. Save + Share + mode label = visually messy.**
The toolbar above the look image stacks `Photo | Collage` segmented control, a "Photo/Collage" text label, the `Save` button, and the `Share` button — three different shapes, two button styles, redundant label. On 393px viewport this wraps awkwardly.

**3. Saved looks have no home.**
`user_saved_looks` rows are written but the user can't see them. Account page only has Wishlist / Wardrobe tabs.

---

## Plan

### 1. Fix collage caching
In `src/components/ProductGeneratedLook.tsx`, replace the `hasUsedEntries` check with one that accepts any non-empty debug entry from a successful path (`'used'`, `'cache_hit'`, or simply a present `used_url`). A collage image that's actually stored in `look-images` storage is valid regardless of which debug status it carries. Both call sites (lines ~459 and ~492) get the same fix.

### 2. Clean up the save/share toolbar in `LookCardV2.tsx`
Inside the bar above the image (lines ~226–274):
- Drop the redundant "Photo / Collage" text label on the right (the segmented control already shows mode).
- Replace the two big pill buttons with a unified icon-only action row: bookmark icon + share icon, same size, same neutral outline style, same hover treatment. Tooltips on hover/long-press carry the labels.
- Keep the segmented `Photo | Collage` control on the left untouched.

Update `SaveLookButton.tsx` and `LookShareMenu.tsx` to expose a compact "icon" variant (32×32, no text) used here; keep the existing text variant available for anywhere else they're rendered.

### 3. Add a "Looks" tab to the account page
- Extend `useSavedLooks` to expose the full saved rows (not just `keys`): `savedLooks: Array<{ id, name, description, image_url, product_codes, created_at }>`.
- In `src/pages/AccountPage.tsx`, add a third tab "Looks" alongside Wishlist and Wardrobe (icon: `Sparkles` or `Bookmark`). Renders a 2-up grid on mobile / 3-up on desktop of saved look cards: image, name, product count, remove (X) button. Tap a card → opens `ProductPreviewSheet` for the first product, or links to the share page if we want (decision: just link to `/look/share?...` reusing existing share URL? For now: tap = navigate to the first product's page; X = remove from saved).
- Accept `?tab=looks` in the URL the same way the existing tabs do.

### Technical notes
- No DB migration needed — `user_saved_looks` already stores `name`, `image_url`, `product_codes`.
- Fetching saved-look details: hook adds a second query that returns full rows, kept in sync with `keys`.
- Icon-only buttons should still be ≥32px tap targets for mobile.
- Cache fix is one-line per call site; no schema or edge-function change.

### Files touched
- `src/components/ProductGeneratedLook.tsx` — cache-staleness check
- `src/components/product/LookCardV2.tsx` — toolbar layout
- `src/components/product/SaveLookButton.tsx` — add icon variant
- `src/components/product/LookShareMenu.tsx` — add icon variant
- `src/hooks/useSavedLooks.ts` — expose full saved rows
- `src/pages/AccountPage.tsx` — add Looks tab
