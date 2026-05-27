## Plan

1. Tighten the Total Looks collage input
- Update the `/looks` flow so collage generation uses the same strict lay-flat-only selector already added to the product-page look generator.
- Remove the current fallback that can still pass worn/editorial shots into the collage function.

2. Add a hard rejection layer for worn/detail images
- Centralize the “allowed for collage” rules in the image utility layer.
- Ensure obvious worn, alt, detail, crop, lifestyle, and similar variants return no collage source instead of falling back to a bad image.

3. Invalidate stale collage results in Total Looks
- Add cache/version handling for generated collages on the `/looks` cards so previously bad collages don’t keep rendering after the fix.
- Regenerate only when the old collage was built from older selection rules.

4. Verify the failing route and visual outcome
- Re-check the `/looks` card flow shown in your screenshot, not just the product page flow.
- Confirm the collage pipeline now receives packshot / lay-flat URLs only.

## Technical details
- Files likely to update:
  - `src/components/looks/LookCard.tsx`
  - `src/utils/imageUtils.ts`
  - possibly `supabase/functions/generate-look-collage/index.ts` for an extra defensive guard
- Root cause found during review:
  - `ProductGeneratedLook.tsx` already uses `getCollageSourceImage(...)`
  - `src/components/looks/LookCard.tsx` still uses `getFlatLayImage(...) || imgs[0]`, which can pass a worn image into `generate-look-collage`
- Expected result:
  - Total Looks collages stop cutting out worn/model photos and only use lay-flat/packshot sources.