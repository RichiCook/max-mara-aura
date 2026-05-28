## Goal
Stop generating collages with an AI model. Instead, for every product in a total look, take its approved lay-flat (plain background) image and arrange all of them together into one collage image on a plain background.

## How it should work
1. For each product in the look:
   - Use `products.approved_lay_flat_image_url` if set (reviewed source of truth).
   - Otherwise fall back to the strict lay-flat selector already in `imageUtils.ts` (`getCollageSourceImage`).
   - If neither yields a clean lay-flat, skip the product (do not substitute a worn/editorial shot).
2. Fetch each chosen image through the existing `export-image-proxy` to bypass CORS/hotlink protections.
3. Compose them into a single collage image:
   - Plain neutral background (matches Casadei warm-naturals palette, e.g. `#f0ece7`).
   - Smart layout based on product count and category (e.g. apparel center, shoes bottom, bag side). 1–5 products supported.
   - Preserve each image's transparency / trim whitespace around the product; no AI relighting, no regeneration.
4. Upload the resulting PNG to the `look-images` storage bucket and return its public URL, same contract the frontend already consumes.

## Where to change
- `supabase/functions/generate-look-collage/index.ts`
  - Remove the Gemini/AI image generation path.
  - Replace with a deterministic compositor using `ImageScript` (Deno-friendly) or `npm:sharp` to: download each lay-flat, trim background, place onto a fixed canvas per layout template, encode PNG, upload to storage.
  - Keep the `trusted_image` parameter so admin-approved URLs always win.
  - Return `{ url, used_sources: [...] }` for traceability.
- `src/components/ProductGeneratedLook.tsx`
  - Build the input array as `{ product_id, image_url }` where `image_url` is the approved lay-flat (already implemented), and pass it straight to the function.
  - Show a clear "missing lay-flat" badge for any product the function reports as skipped, with a link to the Image Review page.
- `src/utils/imageUtils.ts`
  - No logic change needed; reuse `getCollageSourceImage` as the fallback inside the edge function (port the same rules to Deno).

## Layout templates (initial)
- 1 product → centered.
- 2 products → side-by-side, equal width.
- 3 products → triangle (top center, bottom-left, bottom-right).
- 4 products → 2x2 grid.
- 5+ products → main item large left, others stacked right.
Each cell auto-fits the lay-flat with padding; shoes always anchor to the bottom row when present.

## Out of scope
- No changes to the image review schema or classifier — those stay as the trust source.
- No new AI calls; collage becomes purely deterministic image composition.

## Expected result
- Collages are visibly just the real product photos placed together on a plain background.
- No more worn/editorial shots leaking in.
- Failures are explicit ("missing lay-flat for product X") instead of silent substitution.
