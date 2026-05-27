## Plan

1. Preserve the original Max Mara image variants during scraping.
   - Stop rewriting valid Max Mara URLs into `/s3details/` paths.
   - Keep the original folder and filename signals (`/s3master/`, `-a-`, `-w-`, `_normal`) so clean packshots survive into the product record.

2. Make collage generation fail-safe for lay-flat-only inputs.
   - Tighten the source-image selection so the collage pipeline only uses master packshots / lay-flat images for cutout generation.
   - Explicitly reject worn/editorial/detail candidates before background removal runs.
   - If a product has no acceptable lay-flat source, skip that item instead of cutting out a model shot.

3. Bust stale cached collage results.
   - Add a lightweight source signature to each generated collage based on the selected lay-flat URLs.
   - On load, if the cached collage was built from older/wrong sources, ignore it and regenerate automatically.
   - This prevents previously bad collages from continuing to show after the fix.

4. Verify against the failing Max Mara case.
   - Confirm the `lega-cristallo` product resolves to the master lay-flat image instead of the worn shot.
   - Recheck the collage path so the cutout is produced from the lay-flat image only.

## Technical details

- Files to update:
  - `src/utils/FirecrawlService.ts`
  - `src/utils/imageUtils.ts`
  - `src/components/ProductGeneratedLook.tsx`
  - possibly `supabase/functions/generate-look-collage/index.ts` for an extra lay-flat guard

- Expected behavior after the fix:
  - The collage system removes background from real lay-flat product images.
  - It no longer cuts out people/editorial shots when Max Mara provides both types.
  - Old cached bad collages get replaced automatically.