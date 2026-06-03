## What the error means

The red "Collage failed — Collage stream failed: 500 Network connection lost" toast is the new **Quick** collage mode crashing the edge function. Logs for `generate-look-collage` at the time of the screenshot show repeated `ERROR Memory limit exceeded` followed by `shutdown`. When the worker dies mid-stream, the browser sees the SSE connection drop as HTTP 500 and `collageStream.ts` throws that exact message.

Quality mode is unaffected.

## Why Quick OOMs

In `supabase/functions/generate-look-collage/index.ts`, the `runAiCollageQuickStream` path does, per request:

1. `Promise.all` fetch of every reference image → all original bytes resident at once.
2. Decodes each with `imagescript` and resizes to 768px → multiple full RGBA bitmaps + re-encoded PNGs in memory simultaneously.
3. Base64-encodes the resized PNGs for the AI gateway prompt.
4. Buffers every `image_generation.partial_image` payload (~1–2 MB base64 each) to re-emit as SSE.

Combined footprint easily exceeds the edge function memory cap with 4–6 references.

## Fix

Keep the Quick/Quality toggle and SSE transport. Strip the two things that cause the OOM and make the stream cheaper.

### 1. Drop `imagescript` resizing entirely (biggest win)

- Remove the `imagescript` import and the decode/resize step.
- Send the original reference image URL or its raw base64 to the AI gateway without re-encoding. The model already handles arbitrary input sizes; client-side shrink was a perceived-speed optimization, not a correctness one.
- This removes the largest allocations (decoded bitmaps + re-encoded PNGs).

### 2. Sequential, not parallel, reference fetches in Quick mode

- Replace `Promise.all(refs.map(fetch))` with a small `for…of` loop. Same total latency on a warm gateway; peak memory drops from N×image to 1×image.

### 3. Slim the SSE forwarding

- Don't buffer each partial frame into a JS string before emitting. Pipe the gateway SSE bytes through with a `TransformStream` and only parse the terminating `image_generation.completed` to know when to upload-to-storage and emit `final`.
- Reduce `partial_images` from whatever the current value is to `1` (one preview) for Quick. Fewer in-flight base64 PNGs.

### 4. Client safety net

- In `src/lib/collageStream.ts`, if the SSE stream errors or ends without `final`, automatically retry **once** in Quality mode (non-streaming `supabase.functions.invoke`) before showing the toast. This way a Quick-path OOM degrades to a slower-but-working result instead of a red error.
- Keep the toast only if the Quality fallback also fails.

### 5. Verify

- Deploy `generate-look-collage`.
- Open the affected look on the product page, confirm the collage renders end-to-end on Quick mode without the red toast.
- Re-check edge function logs for `Memory limit exceeded` — should be gone.

## Revert path

All changes are inside `generate-look-collage/index.ts` and `collageStream.ts`. The Quick/Quality toggle, settings row, and `collageMode.ts` are untouched, so users can still flip to Quality at any time, and a full revert is a single redeploy of the previous function version.

## Files

- `supabase/functions/generate-look-collage/index.ts` — remove imagescript, sequentialize fetches, slim SSE forwarder, cap `partial_images: 1`.
- `src/lib/collageStream.ts` — one-shot fallback to Quality on Quick stream failure.
- `package.json` — `imagescript` may become unused in the edge function (Deno import, so no npm change needed, but the import line is removed).

No DB migration. No new secrets.
