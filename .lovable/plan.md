## Goal
Make the selected product images render correctly in the Look Generator and make Photo/Collage generation complete successfully instead of hanging.

## What I’ll change
1. Normalize product image data everywhere this flow reads it
- Update the admin Look Generator data flow so `products.images` is always converted into a clean array of individual URLs.
- Reuse the same normalization already used elsewhere in the project so newline-joined image strings no longer become one broken `img src`.
- Make the preview cards consistently pick a single valid product image for each selected item.

2. Proxy external product images before sending them to AI generation
- Route Max Mara CDN product images through the existing backend image proxy before passing them to the image-generation functions.
- Keep direct URLs when they are already safe, but proxy hotlink-protected URLs so the AI service can actually fetch them.
- Apply this to both the photo generator and the collage generator path.

3. Tighten the generator UI state handling
- Ensure the loading state ends cleanly when generation fails.
- Surface a visible error toast when the backend rejects an image URL or generation fails, instead of silently staying on “Generating…”.
- Keep the Photo/Collage toggle working, but only auto-trigger generation when the image payload is valid.

4. Validate the end-to-end flow
- Test that selected product thumbnails render.
- Test that collage generation returns an image instead of stalling.
- Test that photo generation still works with the proxied references.

## Root cause
Two things are breaking the flow:
- Some product `images` values are stored as newline-joined URLs, but parts of the admin look flow are treating them as a ready-to-use string array. That makes product thumbnails invalid.
- The AI image service cannot fetch certain external Max Mara image URLs directly because the upstream CDN blocks them, so generation fails before an image is produced.

## Technical notes
- Frontend files likely involved: `src/components/looks/LookGeneratorPanel.tsx`, `src/components/looks/LookCard.tsx`, and shared image helpers.
- Backend/files likely involved: `supabase/functions/generate-look-image/index.ts`, `supabase/functions/generate-look-collage/index.ts`.
- I’ll reuse the existing `export-image-proxy` pattern already stored in the project memory instead of inventing a new backend route.