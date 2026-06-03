
## Goal

Make collage generation feel faster by adding three opt-in optimizations, gated behind a global **Quick / Quality** toggle on the AI Generation Settings dashboard. Quality = current behavior (zero risk, easy revert). Quick = streaming + parallel reference fetches + shrunk reference images.

## 1. Settings toggle (dashboard)

- Add a new row in `src/pages/AIGenerationSettingsPage.tsx`, inside the existing "Look Display Settings" card (or a new sibling card "Collage Generation"), with a segmented control: **Quick** | **Quality**. Default = Quality so nothing changes for existing users until they flip it.
- Persist in `app_settings` under id `collage_generation_mode` → `{ mode: 'quick' | 'quality' }`. Follow the same pattern as `look_display_settings` already in this file (upsert on change, fetch on mount).
- Small helper `src/lib/collageMode.ts` exporting `fetchCollageMode(): Promise<'quick' | 'quality'>` with an in-memory cache + a `subscribeCollageMode` so consumers refresh when the admin toggles it. Default `'quality'` on error.

## 2. Edge function changes — `supabase/functions/generate-look-collage/index.ts`

Add an optional `mode: 'quick' | 'quality'` field on the request body (default `'quality'` if missing → 100% backward compatible).

When `mode === 'quick'`:

a. **Parallel reference fetches** — replace the sequential `for` loop that downloads each product image with `Promise.all(products.map(fetchAndEncode))`. Same per-item error handling; one failure shouldn't kill the batch (use `Promise.allSettled` and drop failures, matching current behavior).

b. **Shrink reference images** — after fetching each product image, resize to max width 768px before base64-encoding, using Deno-compatible image processing (`https://deno.land/x/imagescript`). Keep aspect ratio. Skip resize if image is already ≤768px wide. Wrap in try/catch — on resize failure fall back to the original bytes.

c. **Streaming generation** — call the AI gateway with `stream: true` and `partial_images: 1` (OpenAI) or natural streaming (Gemini), and forward the SSE body to the client unchanged (same pattern as the `ai-image-generation` guidance: pass `upstream.body` through with `Content-Type: text/event-stream`).

When `mode === 'quality'`: **zero changes** — existing sequential fetch, full-resolution refs, non-streaming response. Same JSON `{ image: dataUrl }` return shape.

## 3. Client changes

**`src/lib/collageStream.ts`** (new) — small helper that:
- Reads current mode via `fetchCollageMode()`.
- If `quality`: calls `supabase.functions.invoke('generate-look-collage', { body: { products, mode: 'quality' } })` exactly as today, returns final `{ image }`.
- If `quick`: uses `fetch()` against the function URL (built from `VITE_SUPABASE_PROJECT_ID`) with `mode: 'quick'`, parses the SSE stream with `eventsource-parser`, and calls an `onFrame(dataUrl, isFinal)` callback. Uses `flushSync` per the streaming guidance so partials actually render.

**`src/components/looks/LookCard.tsx`** and **`src/components/ProductGeneratedLook.tsx`**:
- Replace direct `supabase.functions.invoke('generate-look-collage', …)` calls inside the `collageQueue(() => …)` wrappers with a call to the new helper.
- Add an `onFrame` handler that sets the collage URL on every event, plus a `isFinal` state so we can apply a CSS blur to partial frames (`filter: blur(16px)` while streaming, none on final) — matches the documented UX.
- `collageQueue` (concurrency = 2) stays in place for both modes.

Install: `bun add eventsource-parser`.

## 4. Revert path

Three knobs make this safe:
- Default mode is `'quality'` — no user sees Quick until an admin flips it.
- Edge function's quality branch is the exact current code path.
- To fully revert: delete `collageStream.ts`, `collageMode.ts`, the settings row, the `mode` param in the edge function, and restore the direct `supabase.functions.invoke` calls in the two components. No schema migration needed (we use `app_settings` which already exists).

## Technical notes

- `imagescript` is pure TS, no native deps, works under Deno edge runtime.
- SSE through Supabase Edge Functions: confirmed supported by streaming the upstream `ReadableStream` directly (do not wrap or rebuild it).
- `partial_images` only applies to OpenAI models; current function targets `google/gemini-2.5-flash-image` per `app_settings.image_provider` — Gemini emits partials natively, so just send `stream: true`.
- Cache key (`collage_source_signature`) should incorporate `mode` so a cached Quality collage isn't returned for a Quick request and vice versa — append `:q` or `:hq` suffix.

## Files touched

- `src/pages/AIGenerationSettingsPage.tsx` (toggle UI)
- `src/lib/collageMode.ts` (new)
- `src/lib/collageStream.ts` (new)
- `src/components/looks/LookCard.tsx` (use helper, render partials with blur)
- `src/components/ProductGeneratedLook.tsx` (same)
- `supabase/functions/generate-look-collage/index.ts` (mode branch: parallel fetch + resize + stream)
- `package.json` (add `eventsource-parser`)

No DB migration. No new secrets.
