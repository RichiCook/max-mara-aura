## Goal
Create a reliable review workflow so scraped product images are classified first, suspicious ones are surfaced for human approval/change, and collages only use trusted lay-flat images.

## Plan
1. Normalize scraped product images into reviewable database records
- Add a dedicated table for product image candidates instead of relying only on the raw `products.images` array.
- Backfill one row per image URL from existing products, keeping product ID/code, original URL, source, sort order, and normalized filename signals.
- Add product-level fields for the currently approved lay-flat image so the storefront has one clear source of truth.

2. Run a first-pass lay-flat classifier and suspicion scoring
- Build a backend pass that evaluates every scraped image using the same strict source rules already used in collage generation.
- Mark each image with a machine label such as `likely_lay_flat`, `suspicious`, `rejected`, plus confidence and explicit reasons like `worn_variant`, `detail_crop`, `ambiguous_angle`, `no_master_packshot`, or `domain_rule_mismatch`.
- Preselect the best candidate per product when confidence is strong, but keep ambiguous products in a review-needed state.

3. Add an admin review queue for approval and correction
- Create a dedicated admin screen for product image review, not just per-product editing.
- Show products grouped by review state: `needs review`, `suspicious`, `approved`, `missing lay-flat`.
- For each product, show all scraped images, the suggested lay-flat, reason badges, and clear actions: `Approve`, `Reject`, `Mark suspicious`, `Set as lay-flat`, and `Paste replacement URL`.
- Add filters for collection/category and a quick “only show unresolved” mode so the review workload is manageable.

4. Add a per-product detail editor for overrides
- Extend the existing product edit flow with an image-review section so a specific product can be fixed without going through the full queue.
- Allow admins to manually override the approved lay-flat image, clear an incorrect approval, and trigger reclassification if the image list changes.
- Keep a lightweight audit trail in the database: who reviewed it, when, machine reasons, and whether the final choice was manual or automatic.

5. Make collage generation trust only reviewed or explicitly trusted sources
- Update the collage pipeline so it reads the approved lay-flat image first.
- If a product has no approved/trusted image, skip it or block collage generation with a clear status instead of silently using worn/editorial photos.
- Persist the exact approved URL used in collage debug output so any future failure is traceable.

6. Add visibility and safety checks
- Add admin counts/cards for `approved`, `suspicious`, `missing`, and `recently changed` so the team can see backlog and progress.
- Add a one-click re-run to refresh machine labels after imports or classifier-rule changes.
- Add a backfill/repair action to rescan all existing products and repopulate review records from `products.images`.

## Technical details
- **Current gap:** product images currently live as raw URL arrays in `products.images`, so there is no per-image review state, suspicion flag, or explicit approved lay-flat source.
- **Recommended data model:**
  - New table: `public.product_image_candidates`
  - Suggested fields: `id`, `product_id`, `product_code`, `image_url`, `source_order`, `source_kind`, `machine_label`, `machine_confidence`, `suspicion_reasons jsonb`, `review_status`, `is_selected_lay_flat`, `manual_override`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`
  - Add product-level source-of-truth field(s): `approved_lay_flat_image_url` and optionally `lay_flat_review_state`
- **Suggested review states:** `pending`, `approved`, `rejected`, `suspicious`, `missing`, `auto_selected`
- **Suggested machine reasons:** `master_packshot_match`, `full_front_match`, `shoe_packshot_match`, `detail_suffix`, `worn_suffix`, `editorial_folder`, `multiple_candidates`, `no_safe_candidate`
- **Likely files to update:**
  - `src/pages/ProductEditPage.tsx`
  - new admin review page/component for product image review
  - `src/hooks/useProducts.ts`
  - `src/utils/imageUtils.ts`
  - `src/components/ProductGeneratedLook.tsx`
  - `supabase/functions/generate-look-for-product/index.ts`
  - `supabase/functions/generate-look-collage/index.ts`
  - migration(s) for the new review table and product fields
- **Access model:** admin-only write access for review actions; public storefront only reads the approved result already attached to the product.

## Expected result
- Every scraped product image gets a machine signal before it can affect collage output.
- Suspicious products are visible in a review queue instead of hiding inside raw JSON arrays.
- Admins can approve or replace the lay-flat image per product.
- Collages stop falling back to worn/editorial shots because the pipeline only uses approved or explicitly trusted lay-flat sources.