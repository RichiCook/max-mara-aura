# Add Collage Mode to Total Look Generation

Today the Total Look generator produces a single AI photoshoot image (model wearing the products) via the `generate-look-image` edge function. We'll add a second visual mode: a **product cut-out collage** like the reference image — packshots of each item arranged together on a soft neutral background, no model.

The user keeps the existing photoshoot option AND gets a new collage option. Both modes coexist per look.

## UX

In the Total Look generator panel (`LookGeneratorPanel.tsx`) and on each generated/saved look card (`ProductGeneratedLook.tsx` / `LookCardV2.tsx`), add a mode toggle:

- **Photoshoot** (existing) — AI-rendered model wearing the look
- **Collage** (new) — composed packshots of each product on a neutral backdrop

When a user clicks "Generate image" they pick the mode (or generate both). The result is displayed in the same image slot. They can switch between the two if both exist.

## How the collage is built

The collage is composed deterministically from existing product packshot images — no model, no AI hallucination of garments. Two-step pipeline inside a new edge function `generate-look-collage`:

1. **Pick best packshot per product** — reuse the existing flat-lay / SKU-filter logic (`getFlatLayImage`, `filterImagesBySku`, optional `classify-shoes`-style classification) so we pick the cleanest cut-out-style image per product.
2. **Compose the collage** — call Lovable AI Gateway (`google/gemini-3.1-flash-image-preview`, the editing model) with all product packshots attached and a prompt that:
   - Cuts out each garment from its background
   - Arranges them in an editorial flat-lay collage (coat as anchor, knit + jeans layered, accessories floating around — matching the Max Mara luxury aesthetic)
   - Uses a soft warm-neutral backdrop (palette token `--background` / Warm Naturals `#f0ece7`)
   - No model, no mannequin, no text

This matches our existing pattern for `generate-look-image` (image-editing gateway calls with multiple image refs) and stays within the Lovable AI Gateway — no new secrets.

## Data

Add a second nullable column to the `looks` table so we can store both renders without losing the existing one:

- `image_url TEXT` (already there, used by photoshoot)
- `collage_url TEXT` (new)

A `mode` field is not needed — the UI just shows whichever the user is viewing.

## Files to change

- `supabase/migrations/<new>.sql` — add `collage_url` column to `public.looks`.
- `supabase/functions/generate-look-collage/index.ts` — new edge function (mirrors `generate-look-image` structure, different prompt + no model/style/env references).
- `supabase/config.toml` — register the new function with `verify_jwt = false`.
- `src/hooks/useLooks.ts` — expose `collage_url`, add `generateCollage(lookId)` helper.
- `src/components/ProductGeneratedLook.tsx` — add mode toggle (Photoshoot / Collage), wire new function, show whichever image the user selects.
- `src/components/looks/LookCard.tsx` and `src/components/product/LookCardV2.tsx` — render the toggle + the selected image.
- `src/components/looks/LookGeneratorPanel.tsx` — add a default-mode selector for new generations (Photoshoot, Collage, or Both).

## Out of scope

- No changes to the AI styling / pairing logic (categories, exclusions, prompts for `generate-looks`) — that work was done in earlier turns.
- No new third-party image services; we stay on Lovable AI Gateway.
- No changes to QR codes, scan page, or product page hardcoded naming.
