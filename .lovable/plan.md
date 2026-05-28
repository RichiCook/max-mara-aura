## Problem

The Image Review screen looks like it's "missing" pictures (for example product `5366115106012 - ADDOTTO` shows only variants `a`, `b`, `d` and not the `-w-` flat lay), but the database actually has all the images and classifies them correctly — the `-w-` variant is stored as `likely_lay_flat` at 0.95 confidence and is the approved lay-flat URL.

The real issue is in `src/hooks/useImageReview.ts`. It loads up to 500 products and then runs a single query:

```ts
supabase
  .from('product_image_candidates')
  .select('*')
  .in('product_id', ids)
  .order('source_order', { ascending: true })
```

Supabase caps results at 1000 rows by default. With ~9 candidates per product × 500 products = ~4500 rows, only the first 1000 come back. Because results are ordered by `source_order` ascending across all products, the early-index candidates (a, b, d, etc.) load for every product while the later ones (including the `-w-` flat lay at index 4–5 and the swatches) are silently dropped.

That's why the UI looks broken even though the classifier is correct.

## Fix plan

### 1. Paginate the candidate fetch in `useImageReview`

Replace the single `.in('product_id', ids)` call with a chunked fetch:

- Split `ids` into batches of ~100 product IDs
- For each batch, fetch candidates with an explicit `.range(0, 9999)` (or `.limit(10000)`) and order by `product_id` then `source_order`
- Merge the results into the `byProduct` map

This guarantees we never hit the 1000-row cap silently and we always get every candidate for every product on the page.

### 2. Trim the product page size to something the UI can actually render

`limit(500)` is too many products to render at once anyway. Reduce to a reasonable page (for example 100) and surface the existing state filters more clearly so admins can step through buckets (`auto_selected`, `suspicious`, `missing`, `approved`) without overloading the page.

### 3. Verify on the ADDOTTO example

After the fix, the ADDOTTO card should show 5 product photos (a, b, d, e, w) plus 4 swatches, with the `-w-` card marked `likely_lay_flat` and visibly used as the approved lay flat.

## Technical details

- File to change: `src/hooks/useImageReview.ts` (the candidate fetch inside `queryFn`)
- Optional: `src/pages/ImageReviewPage.tsx` only if we lower the product page size and want to expose pagination controls
- No backend, schema, or classifier changes needed — the data in `product_image_candidates` is already correct

## Validation

- Open `/admin/image-review`, scroll to product `5366115106012 - ADDOTTO`, confirm all 5 photo candidates appear and the `-w-` is the auto-selected lay flat
- Spot-check 5 more Max Mara apparel products and confirm every product shows the full candidate set (no missing tail of candidates)
- Reload with each state filter (`auto_selected`, `suspicious`, `missing`) and confirm no product is missing candidates that exist in the database
