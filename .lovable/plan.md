# Plan: Database-first lay-flat review and suspicious-image approval

## Outcome
Create a reliable workflow that:
- scans the scraped product images already stored in the database,
- marks the most likely lay-flat image first,
- flags uncertain cases as suspicious,
- gives you an admin screen to approve, replace, or reject each choice,
- makes collage generation use only approved lay-flat images.

## What already exists
There is already a good foundation in place:
- `products` has `approved_lay_flat_image_url` and `lay_flat_review_state`
- `product_image_candidates` stores per-image machine labels, confidence, reasons, and review state
- `/admin/image-review` already lists candidates and lets an admin approve, reject, or paste a replacement URL
- `classify-product-images` already applies URL-based lay-flat rules for Max Mara and generic `_Full` image patterns

Current gap:
- the review system is present, but the database is still effectively unprocessed right now (`products` are still in `pending`, and there are no candidate rows populated), so the pipeline is not yet reliably filling the review queue.

## Implementation plan

### 1) Fix and harden the classifier pipeline
Make the image classification pass dependable before changing the UI.
- Ensure the classifier always reads the scraped image list from `products.images`
- Normalize all image formats consistently before scoring
- Align request payload naming between frontend and backend so targeted rescans work correctly
- Preserve manual approvals and never overwrite `approved_lay_flat_image_url` when a human already approved an image
- Record clear suspicion reasons for every non-confident candidate

### 2) Make the database the source of truth for review state
Use database fields to represent the full moderation workflow.
- `approved_lay_flat_image_url` remains the only trusted image used downstream
- `lay_flat_review_state` becomes the product-level status used by the admin queue
- `product_image_candidates` remains the candidate ledger with labels, confidence, source order, and reasons
- Add or tighten any missing indexes/constraints only if needed for queue performance and duplicate prevention

### 3) Improve suspicious-case review UX
Refine the existing Image Review screen instead of replacing it.
- Keep product-level filters: pending, suspicious, missing, approved, auto-selected
- Surface the machine-picked image first for each product
- Make suspicion reasons more readable and prominent
- Show which image is currently trusted for collage use
- Add better admin actions for:
  - approve this candidate
  - reject this candidate
  - flag the whole product as suspicious
  - set a manual replacement URL
  - jump to the product edit page when source data needs fixing

### 4) Add review signals that help you trust the machine choice
Make the screen explain why an image was picked or flagged.
- Show confidence score in a human-readable way
- Show detection reasons such as packshot folder, allowed variant, detail crop, worn/editorial variant, back view, or no safe pattern match
- Separate “auto-selected and safe” from “candidate exists but needs approval”
- Highlight products with no acceptable lay-flat at all

### 5) Connect collage generation to approved images only
Use the review outcome to eliminate bad collage inputs.
- For each product in a look, use `approved_lay_flat_image_url` first
- Only fall back to strict lay-flat selection when there is no approved image and the rules are clearly safe
- Skip products with no safe lay-flat instead of silently using editorial/worn shots
- Return traceability data so the UI can show missing or skipped products

## Technical details
- **Frontend**
  - `src/hooks/useImageReview.ts`: align rescan payloads, preserve queue behavior, improve invalidation
  - `src/pages/ImageReviewPage.tsx`: surface confidence/reasons better, emphasize trusted selection, improve suspicious workflow
- **Backend function**
  - `supabase/functions/classify-product-images/index.ts`: harden normalization, scoring, payload handling, and manual-approval protection
- **Utilities**
  - keep lay-flat rules in sync with `src/utils/imageUtils.ts` and the collage selector
- **Database**
  - only add a migration if we discover a real schema gap; otherwise reuse the existing review schema and focus on making the classifier actually populate it

## Validation
After implementation, verify with real data:
- run the classifier on unreviewed products
- confirm candidate rows are created in the database
- confirm products move from `pending` into `auto_selected`, `suspicious`, or `missing`
- manually approve/reject a few suspicious products and confirm the database updates correctly
- generate a collage and confirm it uses only approved or strict-safe lay-flat images

## Expected result
You get a practical approval workflow rather than blind automation:
- the database is reviewed first,
- likely lay-flat images are preselected,
- suspicious products are clearly surfaced,
- you can approve or change them quickly,
- and total look collages stop pulling the wrong images.