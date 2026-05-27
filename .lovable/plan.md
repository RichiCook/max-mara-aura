## Plan

1. Tighten Max Mara URL normalization so it preserves the original gallery variant and folder (`s3master` vs `s3details`) instead of rewriting valid flat-lay URLs into detail/worn variants.
2. Update image extraction ranking to explicitly favor `s3master` product-only images for accessories and other non-shoe categories before any `s3details` or worn/detail shots.
3. Add a defensive fallback in the flat-lay selector so products like `1756035606001` always resolve to the `-a-`/`s3master` packshot when that URL exists in the image set.
4. Verify against the `lega-cristallo` product signals from the live page and ensure the collage pipeline uses the corrected source image path.

## Technical details

- Files likely involved:
  - `src/utils/FirecrawlService.ts`
  - `src/utils/FreeScraperService.ts`
  - `src/utils/imageUtils.ts`
- Root issue observed:
  - The live product page exposes the correct flat-lay URL: `.../s3master/1756035606001-a-lega_normal.jpg`
  - Current selection logic already prefers `s3master`, so the bad pick is likely caused earlier during scraping/normalization.
- Scope:
  - No UI redesign, no database changes, no image generation changes.
  - Only fix deterministic source-image selection for collages and product thumbnails.