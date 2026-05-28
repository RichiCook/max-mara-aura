## Problem

The Max Mara lay-flat detector is inverted. The current rules in `classify-product-images` treat the `-a-` variant in `/s3master/` as the lay-flat packshot, but on Max Mara that file is actually the **worn / on-model front shot**.

The real flat product picture (plain background, no model) lives in `/s3details/` with the `-w-` variant code, for example:

```
.../5021056106/029/s3details/5021056106029-w-wkdbiglia_normal.jpg
```

Confirmed in the database for `5021056106029 - WKDBIGLIA`: the product image array contains `-a-` in `s3master/` (model shot) and `-w-` in `s3details/` (true flat lay), plus `-b/-d/-e/-f-` detail shots and `s3swatch/` color chips.

That is why every Max Mara apparel product is being auto-approved with the wrong picture.

## Fix plan

### 1. Rewrite the Max Mara variant rules in the classifier

In `supabase/functions/classify-product-images/index.ts`, replace the current Max Mara branch with rules that match the real URL convention:

- `/s3swatch/` → rejected (color chip)
- `/s3master/` + `-a-` + `_normal` → reclassify as **worn / front model shot**, label `rejected` for collage use (or `suspicious` low-confidence fallback when no `-w-` exists)
- `/s3details/` + `-w-` + `_normal` → **likely_lay_flat**, high confidence — this is the true flat product picture for apparel
- `/s3details/` with `-b-`, `-d-`, `-e-`, `-f-` + `_normal` → rejected as detail/back/closeup
- Shoes: keep `/s3master/` + `-a-` as lay-flat (shoes are already shot flat on white in master), and skip the apparel `-w-` rule
- Anything else on `maxmara.com` with `_normal` but no clear pattern → `suspicious`

### 2. Reset existing wrong approvals so the new pass can redo them

Run a one-time database update for Max Mara apparel products that were auto-selected by the old rule:

- Clear `approved_lay_flat_image_url` and reset `lay_flat_review_state` to `pending` only for rows where the current approved URL is `/s3master/...-a-..._normal...` AND the category is not a shoe category
- Leave manually approved rows (`lay_flat_review_state = 'approved'` with `manual_override = true` candidates) untouched
- Also wipe the stale `product_image_candidates` rows for those products so the rescan rebuilds them cleanly

### 3. Re-run the classifier and verify

- Trigger the "Scan unreviewed" button on `/admin/image-review`, which now chains batches
- Confirm the example product `5021056106029 - WKDBIGLIA` ends with `approved_lay_flat_image_url` pointing at the `-w-` `s3details` URL
- Spot-check 5–10 more apparel products and a couple of shoes to confirm shoes still pick the `-a-` `s3master` shot

### 4. Keep collage selection in sync

The collage edge function (`generate-look-collage`) already prefers `approved_lay_flat_image_url`. Once the database is corrected, no collage code change is required, but verify a generated total look uses the corrected images and no longer shows model crops.

## Technical details

- File to change: `supabase/functions/classify-product-images/index.ts` (the `classifyUrl` Max Mara block, lines ~47–78)
- Migration: a single SQL update to clear wrong approvals and stale candidates, scoped by URL pattern and non-shoe category
- No frontend changes required — `ImageReviewPage` already surfaces reasons, candidates, and the "Scan unreviewed" action
- No new tables, no schema changes

## Validation

- Manually open `/admin/image-review`, filter by `auto_selected`, and confirm Max Mara apparel now shows `-w-` `s3details` packshots as the approved image
- Open the affected product page on the live site and confirm the trusted image used by collages is the flat packshot, not the worn shot
- Generate one total look and confirm the collage uses only flat packshots
