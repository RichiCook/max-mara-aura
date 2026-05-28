# Make Look collages render like Atelier Compositions

## Why the current collages look "broken"

The Look collage uses a deterministic background-removal + grid composite pipeline (`supabase/functions/generate-look-collage/index.ts` → `removeBackground` + `layoutCells`). It flood-fills from the image border through anything that resembles the studio backdrop, then drops the cutouts into a fixed grid. On light/neutral garments (cream knits, beige trousers) the flood reaches inside the garment because those pixels score as "close to backdrop", and the result is the shredded silhouettes you saw.

Atelier Compositions (`src/components/product/AtelierCompositions.tsx` + `supabase/functions/generate-composition/index.ts`) produce clean, cohesive still-life images because they don't try to cut anything out — they send the real product photos to Gemini (`google/gemini-3.1-flash-image-preview`) with a strict "reproduce each product exactly, no cropping" prompt, and the model composes a believable shared-surface photograph. Result is cached to `look-images` storage.

## Plan: rebuild `generate-look-collage` on top of the same Atelier pipeline

Rewrite `supabase/functions/generate-look-collage/index.ts` so it produces collages the same way Atelier does — AI-composed still life from the real flat-lay photos — and drop the cutout/grid path entirely.

1. **Inputs unchanged.** Keep the existing request shape (`{ products: [{ name, color, category, image, trusted_image }] }`) so `ProductGeneratedLook.tsx` and `LookCard.tsx` don't have to change. Internally, use `trusted_image || image` as the source URL for each product (admin-approved lay-flat first, same rule we just enforced).
2. **Fetch each product image as base64.** Reuse the `fetchImageAsBase64` helper pattern from `generate-composition` (route through `export-image-proxy` to bypass CORS/hotlink, fall back to direct fetch). No background removal, no resizing, no cutout step.
3. **Call Lovable AI Gateway with Gemini image model.** Same call shape as `generate-composition`:
  - `model: "google/gemini-3.1-flash-image-preview"`
  - `modalities: ["image", "text"]`
  - One user message containing the prompt + all product images as `image_url` parts
  - Prompt adapted for Looks (multiple garments worn-together still life), keeping the Atelier "ABSOLUTE RULES" block verbatim: reproduce each product exactly, no invented items, no cropping, no color changes, square 1:1, shared surface, professional studio lighting, no text/logos, breathing room.
  - Background = `#f0ece7` (Warm Naturals soft, matches the current canvas BG and the brand memory).
4. **Cache to storage.** Hash the set of source URLs (sorted, joined, SHA-256, first 16 chars) into a deterministic key like `looks/{hash}.png` in the existing `look-images` bucket. On request:
  - If the object exists, return its public URL immediately (no AI call).
  - Otherwise generate, upload with `upsert: true`, return the public URL.
   This replaces the current `collage_source_signature` + `collage_cache_version` invalidation dance with a content-addressed cache — the frontend's existing `buildCollageSourceSignature` check still works as a client-side guard.
5. **Return shape.** Keep `{ image, debug, generated_at, items_used, items_skipped, method }` so existing callers keep working. `image` becomes the storage public URL (string) instead of a `data:` URL — `ProductGeneratedLook.tsx` already handles both via `uploadImageToStorage` (it will just re-upload, which is harmless, or we can short-circuit when `data.image` starts with `http`).
6. **Graceful failures.** Surface 429 (rate-limited) and 402 (credits exhausted) verbatim — the frontend already has a retry path for "Rate limit" in the error message.
7. **Delete the dead code.** Remove `removeBackground`, `trimTransparent`, `applyDropShadow`, `layoutCells`, `buildCollage`, `decodeProduct`, `isAllowedPackshot`, `deriveMaxMaraPackshot`, `selectPackshotCandidates`, `fetchImageBytes`, and the `imagescript` import. The file becomes ~150 lines of fetch → AI → cache, mirroring `generate-composition`.

## Frontend

No required changes. `ProductGeneratedLook.tsx` line 317 (`supabase.functions.invoke('generate-look-collage', …)`) and `LookCard.tsx` line 174 keep working untouched. Optional follow-up (not in this plan): short-circuit `uploadImageToStorage` when `data.image` already points at our storage bucket.

## What this fixes

- No more garments dissolving into the background — there's no cutout step that can eat them.
- Visual quality matches Atelier Compositions (cohesive lighting, shadows, surface).
- Same caching guarantees: identical product sets resolve from storage instantly.

## Out of scope

- Touching `generate-composition` itself.
- Adding new composition settings UI (we'll use the existing Atelier-style prompt; we can wire `app_settings.composition_settings` into the Looks prompt in a follow-up if you want shared controls).
- Any DB schema changes.

## Files touched

- `supabase/functions/generate-look-collage/index.ts` — full rewrite (AI pipeline, content-addressed cache).

&nbsp;

keep as a toggle so we can restore easily, just tell me how put it down

&nbsp;