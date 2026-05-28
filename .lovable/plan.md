# Why "No scraped images" shows up everywhere

The images are there. The UI just lies when classification hasn't run.

Confirmed against the database:
- 2870 products are in state `pending`
- All 2870 of them have URLs in `products.images` (the scraped source)
- 0 of them have any rows in `product_image_candidates`

The review screen only reads from `product_image_candidates`. When that table is empty for a product, the card shows "No scraped images. Run classification or add a URL below." — even though `products.images` has 4–6 URLs from the scrape.

Only 344 products have actually been classified (`auto_selected`). The remaining 2870 need the classifier to run before any thumbnails appear.

## Plan

### 1. Stop lying in the UI

In `ImageReviewPage`, when a product has zero candidates:
- Fall back to rendering raw thumbnails directly from `products.images`
- Label the section "Not classified yet — N scraped images found"
- Show a per-card "Classify now" button that calls the existing `classify-product-images` edge function with that single `product_id`

This way the user always sees the scraped photos and can act on them, even before the bulk job runs.

### 2. Auto-classify on load (bounded)

When the review page loads, if any visible product on screen has 0 candidates but >0 entries in `products.images`, fire one `classify-product-images` call with those product IDs (batched, max 100 per call). Re-fetch candidates on success. This makes the page self-healing — no need to remember to press "Scan unreviewed".

### 3. One-time backfill for the 2870 pending products

Add a small admin action "Classify all pending (2870)" next to the existing scan button. It loops the edge function in pages of 200 until `hasMore` is false, with a progress toast. This catches everything in one go without waiting for the user to scroll.

### Technical notes

- `useImageReview.ts` already exposes `classify`. The new per-card and auto-classify calls reuse it with `{ productIds: [...] }`.
- `products.images` is a Postgres `text[]` rendered as a newline-joined string by PostgREST in some payloads — the classifier already handles that via `normalizeImages()`. The UI fallback needs the same normalization (split on `\n`, trim, drop `#thumbnail`/`#product` fragments only for display).
- No schema change. No edge function change. Pure frontend + one extra invoke.

### Validation

- Open `/admin/image-review` with the filter on `pending`. Every card should immediately show scraped thumbnails (from `products.images`) instead of the empty-state message.
- Within a few seconds, the auto-classify call should replace the raw thumbnails with classified candidates and the auto-picked `-w-` flat lay for Max Mara apparel.
- After running "Classify all pending", the `pending` count drops toward 0 and `auto_selected` + `suspicious` grow.
