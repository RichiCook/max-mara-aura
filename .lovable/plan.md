## Goal
Make Total Looks collages use only flat-lay / packshot product images and stop ever cutting out worn/editorial Max Mara images.

## Plan
1. Tighten the collage source selector so it fails closed
- Refactor the shared image selection rules to allow only verified collage-safe images.
- For Max Mara apparel, accept only the clean packshot variant and reject worn/detail/editorial variants entirely.
- For footwear, keep the valid shoe packshot variant if needed, but still reject non-packshot alternatives.
- Remove any remaining fallback that can silently drop to a generic first image.

2. Add a backend whitelist in the collage function
- Make the collage function independently validate each incoming image candidate instead of trusting the frontend.
- Normalize Max Mara URLs only when the result is still an allowed packshot variant for that product category.
- Skip products whose candidates are not collage-safe rather than cutting out the wrong image.
- Return lightweight debug metadata in the response during testing so we can see which URLs were actually used.

3. Handle fetch failures separately from selection failures
- Improve the collage function logs to distinguish:
  - wrong image chosen
  - correct packshot chosen but upstream returned 403
  - no valid flat-lay source available
- Add alternative fetch headers / candidate ordering where useful so valid packshots are tried first.
- If a product has no fetchable flat-lay, omit it from the collage instead of falling back to a worn image.

4. Remove stale card state and cached bad outputs on `/looks`
- Ensure each look card fully resets generated collage state whenever the product set changes.
- Add a simple collage source/version key so previously generated bad collages are not reused after the fix.
- Make the generated tab regenerate from the new safe source list instead of showing an older in-memory result.

5. Validate against real failing products
- Test with the exact Max Mara-style products currently failing in `/looks`.
- Confirm the selected candidate URLs are packshot / flat-lay only.
- Run the collage function with real product payloads and verify the response succeeds without using worn/editorial URLs.
- Re-check the `/looks` route behavior specifically, not just the product page flow.

## Technical details
- Files likely involved:
  - `src/utils/imageUtils.ts`
  - `src/components/looks/LookCard.tsx`
  - `supabase/functions/generate-look-collage/index.ts`
  - possibly `src/pages/LooksPage.tsx` for a version/reset key
- Current evidence from debugging:
  - product image rows contain both `s3master/...-a-...` and `s3details/...-w-...` variants
  - the collage function logs still show 403s for some normalized packshot URLs
  - this means we need both stricter source validation and better handling when the chosen packshot is temporarily unfetchable

## Expected result
- Apparel collages on `/looks` use only flat-lay / packshot sources.
- Worn/model photos no longer appear in generated collages.
- If a valid flat-lay cannot be fetched, the item is skipped rather than incorrectly cut out.
- We can verify exactly which source URLs were used for each tested collage.