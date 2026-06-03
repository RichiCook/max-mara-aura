## Goal

Limit collage image generation to **2 in flight at a time** across the product page, instead of firing all of them in parallel (current behavior staggers them 500 ms apart but lets all N run at once, which trips rate limits and slows the whole batch down).

## Approach

Add a tiny client-side concurrency queue and route every `generateCollageImage` call through it. No edge function changes, no schema changes — purely a frontend throttle.

### 1. New helper: `src/lib/concurrencyQueue.ts`

A minimal promise-pool with a fixed concurrency:

```ts
export function createConcurrencyQueue(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= limit || queue.length === 0) return;
    active++;
    const run = queue.shift()!;
    run();
  };
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        task().then(resolve, reject).finally(() => { active--; next(); });
      });
      next();
    });
  };
}
```

### 2. Wire it into `src/components/ProductGeneratedLook.tsx`

- Create a module-level queue: `const collageQueue = createConcurrencyQueue(2);`
- Wrap the body of `generateCollageImage` (the `supabase.functions.invoke('generate-look-collage', …)` block) so that the network call runs inside `collageQueue(() => …)`. State updates (`setLooks`, toasts, cache write) stay outside or inside as they are today — only the invoke needs to be gated.
- Remove the `idx * 500` stagger at line 532 — the queue replaces it. Just call `generateCollageImage(...)` directly for each look.
- Retry paths at lines 325 and 353 keep their `setTimeout` backoff; the retried call goes through the queue again automatically.
- `loadMoreLooks` (line 550) and the V2 `onGenerateCollage` handler (line 633) need no changes — they already call `generateCollageImage`, which is now queued.

### 3. Apply the same queue in `src/components/looks/LookCard.tsx`

Reuse the same exported queue instance (import from `@/lib/concurrencyQueue` or share via a singleton in `src/lib/collageQueue.ts`) so the limit is global, not per-component. Wrap the `supabase.functions.invoke('generate-look-collage', …)` call at line 174.

## What stays the same

- Edge function `generate-look-collage` and its rate-limit handling.
- Collage caching (`collage_cache_version`, `collage_source_signature`).
- The user-visible "generate collage" CTAs and the auto-trigger on mode switch.
- Photo generation (`generate-look-image`) is not throttled — only collages, since that's where the contention happens.

## Expected effect

- First two collages start immediately; the rest start as soon as one finishes.
- Fewer 429s from the AI gateway, so fewer 2–3 s retry backoffs.
- Total wall-clock time should be similar or slightly better than today on a happy path, and meaningfully better when the gateway is under load.

## Tunability

`createConcurrencyQueue(2)` is a single constant. If 2 turns out too conservative or too aggressive we change one number.
