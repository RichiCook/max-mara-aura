## Goal
Make the live AI-Curated Looks section on the product page use only flat-lay / packshot images, and make future fixes verifiable instead of guesswork.

## Plan
1. Fix the actual live path shown in your screenshot
- Update the storefront `ProductGeneratedLook` flow, not just the admin `LookCard` flow.
- Make the product-page collage loader ignore stale cached `generated_look.collage_image` entries unless they were produced by the new strict rules.
- Ensure first render on the product page regenerates collages when the cached version is old or missing validation metadata.

2. Make image selection fail closed for collages
- Tighten `getCollageSourceImage` so it returns `null` instead of any generic fallback when a product has no verified flat-lay source.
- Keep a separate permissive selector for thumbnails/product cards if needed, but make collage selection stricter than general display selection.
- For Max Mara apparel, allow only clean master packshots; for shoes, allow only the approved shoe packshot variants.

3. Make the backend the final source of truth
- Strengthen `generate-look-collage` so it validates every incoming candidate and skips any product whose source is not packshot-safe.
- Return debug metadata that records, per product: input candidates, accepted URL, rejection reason, and whether the item was skipped.
- If a valid packshot cannot be fetched, skip the item instead of cutting out a worn/model image.

4. Persist versioned validation so bad outputs do not survive fixes
- Add a stricter collage cache/version signature in the storefront cache payload.
- Store enough metadata with each cached look to know whether a collage was created with the new selector rules.
- On product load, invalidate old cached collages automatically and trigger regeneration from the strict source list.

5. Verify with the exact failing product-page flow
- Test against the real product-page look data that produced the screenshot, not only the admin looks page.
- Inspect the exact selected source URLs for each item in the failing look and confirm they are flat-lay / packshot only.
- Re-run the collage function with those real payloads and confirm the result contains no worn/editorial figures.
- If needed, add temporary logging around the product-page collage generation path so the next report gives us decisive evidence immediately.

## Technical details
- Files likely involved:
  - `src/components/ProductGeneratedLook.tsx`
  - `src/utils/imageUtils.ts`
  - `supabase/functions/generate-look-collage/index.ts`
  - possibly `supabase/functions/generate-look-for-product/index.ts` if cached look payload shape needs version metadata
- Root issue identified from exploration:
  - your screenshot is from the storefront product page, but earlier changes were partly made in the admin look card path
  - the storefront restores `generated_look` cache and only invalidates by a simple version field, so old/wrong collages can survive unless that cache path is explicitly handled
  - the collage selector in `imageUtils.ts` still has permissive fallback behavior that is too loose for cutout generation

## Expected result
- The live AI-Curated Looks carousel on the product page stops showing worn/model cutouts.
- Old wrong collages are automatically discarded and regenerated.
- We can inspect exactly which URLs were used for each collage if anything goes wrong again.