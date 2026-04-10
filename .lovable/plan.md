

## Plan: Fix PNG Export "Image load failed" Error

### Problem
The PNG export in `ProductPreviewCard.tsx` loads product images with `crossOrigin = 'anonymous'`, but the external image servers don't return CORS headers, so the browser blocks the load and throws "Image load failed".

### Fix
Route the product image through the existing `export-image-proxy` edge function (already used elsewhere in the codebase) before drawing it onto the canvas.

### Changes

**File: `src/components/ProductPreviewCard.tsx`**
- Add a helper function to build the proxy URL: `${VITE_SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(originalUrl)}`
- On line 78 where `img.src = mainImage` is set, replace `mainImage` with the proxied URL
- This matches the pattern already used in `exportUtils.ts`, `CelebritySlideshow.tsx`, and `CelebritySpotlight.tsx`

Single file change, ~5 lines added/modified.

