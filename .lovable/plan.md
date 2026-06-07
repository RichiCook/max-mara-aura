## Root cause

Edge function `generate-look-collage` returns a 500 with body `{ "error": "AI collage needs at least 2 product images" }` whenever fewer than 2 of the look's products have an **approved lay-flat image** (`approved_lay_flat_image_url`). The Teddy Bear coat look in the screenshot only has 1 product approved, so the call fails.

Two compounding issues in the frontend:

1. **`ProductGeneratedLook.tsx` only validates `productRefs.length === 0`** (line 310), so it lets a single-image payload through to the edge function, which then 500s.
2. **`collageStream.ts` ignores the JSON error body.** `supabase.functions.invoke` returns a `FunctionsHttpError` on non-2xx whose `.message` is the generic `"Edge Function returned a non-2xx status code"` — exactly what the toast shows. The actual `{ error }` body is never read.

## Fix

### 1. `src/components/ProductGeneratedLook.tsx`
- In `generateCollageImage` (around line 310), change the guard to `productRefs.length < 2` with a clearer message: _"Need at least 2 approved lay-flat images in this look. Approve more in Image Review to compose a collage."_
- Disable the auto-retry (line 360) when the failure is the "at least 2" validation error — retrying can't help.

### 2. `src/lib/collageStream.ts`
- In `invokeQuality`, when `error` comes back from `supabase.functions.invoke`, attempt to read the body via `error.context.json()` (or `.text()`) and throw a new `Error` with that message so the toast shows the real reason instead of "non-2xx status code".

### Files touched
- `src/components/ProductGeneratedLook.tsx` — stricter pre-flight check + clearer toast
- `src/lib/collageStream.ts` — surface edge-function error body

No edge function or DB changes.
