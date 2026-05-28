## Goal
Stop the product-page collage from ever showing worn/model images again, and make failures observable instead of guesswork.

## Plan
1. Tighten the real cache gate on the product page
- Update the live `ProductGeneratedLook` flow so cached collage images are ignored unless they include valid strict-selection metadata.
- Treat any cache entry without a valid `collage_cache_version`, matching `collage_source_signature`, and successful debug records as stale.
- Regenerate the collage automatically on first render when the cache is stale, even if `generated_look` exists.

2. Make the backend cache return path validate before serving cached looks
- Update `generate-look-for-product` so it does not blindly return `heroProduct.generated_look`.
- Add a cache-validity check for look payloads so old cached looks can be rejected server-side and regenerated.
- Ensure newly cached look payloads carry the fields the frontend needs to know they were produced by the strict collage pipeline.

3. Make collage input selection fail closed everywhere
- Keep `getCollageSourceImage` strict and separate from general display-image logic.
- Remove any remaining permissive fallback behavior from the product-page collage payload assembly so a product with no verified flat-lay source is skipped, not substituted with a worn image.
- Keep the collage function as final authority: validate every incoming candidate again before cutout generation.

4. Add decisive debug evidence for the next failure report
- Persist per-product collage debug details with each generated look: accepted URL, rejected URLs, fetch outcome, and skip reason.
- Surface this metadata in the stored cache payload so the storefront can tell whether a collage was built from approved packshots.
- If a collage is invalid or incomplete, force regeneration instead of rendering it.

5. Verify against the exact storefront path shown in your screenshot
- Test the product-page flow, not only the admin look card path.
- Confirm the actual selected source URLs for each product in the failing look are flat-lay/packshot only.
- Re-run collage generation for the failing flow and verify the returned debug payload shows only approved sources or explicit skips.

## Technical details
- Files to update:
  - `src/components/ProductGeneratedLook.tsx`
  - `src/utils/imageUtils.ts`
  - `supabase/functions/generate-look-for-product/index.ts`
  - `supabase/functions/generate-look-collage/index.ts`
- Root issue confirmed from code review:
  - the live product page passes `product.generated_look` straight into `ProductGeneratedLook`
  - `generate-look-for-product` still returns cached `generated_look` without validating collage metadata
  - frontend invalidation exists, but server-side cache acceptance is still too permissive, so old bad look payloads survive and keep reseeding the page

## Expected result
- Old bad collages are no longer trusted.
- New collages only use approved flat-lay packshots, or skip items that do not have one.
- If this ever breaks again, we will have stored debug metadata showing exactly which URLs were accepted or rejected and why.