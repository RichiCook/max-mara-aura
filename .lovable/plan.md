## Goal
Make **Collage** non-generative: for each selected product, use its real flat-lay image, cut the product out, and compose the final collage without inventing garments, colors, or shapes.

## What I’ll build
1. **Replace the collage backend with deterministic composition**
- Remove the current AI-image step from `generate-look-collage`.
- Fetch each product’s chosen flat-lay source image server-side.
- Extract the garment from its background and place the real cutout onto a fixed portrait canvas.
- Return the composed collage image directly.

2. **Use the existing flat-lay image selection rules**
- Keep using the already-established logic that picks the best flat-lay/product-only image per item.
- Ensure the collage pipeline receives only those resolved product packshots, not lifestyle or model shots.
- Preserve exact product appearance by never asking a model to redraw anything.

3. **Create a stable collage layout system**
- Add deterministic placement rules by category:
  - outerwear / dresses as anchors
  - tops and knitwear near the upper-middle
  - bottoms below anchors
  - shoes near the bottom
  - bags and accessories around the sides
- Add subtle shadows and consistent spacing so the result still feels editorial, but remains faithful to the real source images.
- Keep the output in the existing portrait ratio used by the UI.

4. **Improve failure handling in the UI**
- Update collage loading/error copy so it no longer implies AI generation.
- Surface clear errors when a product has no usable flat-lay source or background extraction fails.
- Keep **Photo** as generative, but make **Collage** explicitly real-product composition.

5. **Validate the output**
- Test with real multi-product looks from your catalog.
- Confirm that the collage only contains exact product cutouts from the selected items.
- Verify no hallucinated garments appear and that the existing preview/storage flow still works.

## Files likely affected
- `supabase/functions/generate-look-collage/index.ts`
- `src/components/ProductGeneratedLook.tsx`
- `src/components/product/LookCardV2.tsx`
- possibly shared image helpers if I need one small utility for resolved collage-safe source images

## Technical details
- I’ll use a **server-side image composition pipeline**, not AI generation.
- The cutout step will use the real product image and remove the background before compositing.
- The final collage will be assembled into one raster image and stored through the existing look-image flow.
- This keeps collage deterministic and visually accurate while leaving **Photo** mode unchanged.

## Result
- **Collage = exact cut-and-paste of real flat-lay product images**
- **Photo = generated editorial image**
- No more hallucinated collage items