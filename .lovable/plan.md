

## Goal
Close the real abuse vectors flagged by the security scan without breaking the public DPP experience (which legitimately needs unauthenticated read access to products/activations/looks and unauthenticated lead/repair submissions from QR scans).

## What I will fix

### 1. Repair photos bucket — currently anyone can dump arbitrary files
- Make `repair-photos` bucket **private** (it's currently public).
- Restrict INSERT to: file path under a generated submission folder + size ≤ 5 MB + MIME type in `image/jpeg`, `image/png`, `image/webp`, `image/heic`.
- Keep admin SELECT; remove public SELECT (the edge function `send-repair-email` already runs as service role, so it can still read).
- Update the upload code in the repair flow to use a signed URL when the admin needs to view a photo.

### 2. Look-images bucket — anon upload abuse
- Drop the `Anon can upload look images` policy. Look generation runs server-side via the `generate-look-image` edge function (service role), so anonymous browser uploads are not needed.
- Keep public SELECT (look images are shown on public product pages).

### 3. Public bucket listing (linter warns 3 buckets allow listing)
- Tighten the public SELECT policies on `branding`, `look-images`, `campaign-assets` to require an explicit `name` match pattern instead of bucket-wide listing. Practically: keep `bucket_id = 'X'` SELECT (needed to fetch by URL), but add per-bucket configuration to disable listing via `storage.buckets.public = true` + path-scoped policies. The simplest fix that addresses the linter: replace the broad SELECT with a policy that allows reading any object in the bucket but blocks `LIST` operations (which require a different permission pattern). I'll implement this by keeping read-by-key and not granting listing.

### 4. Leads table — anonymous flood / spam protection
- Add input length CHECK constraints: `email ≤ 255`, `name ≤ 100`, `phone ≤ 32`, `reward_code ≤ 64`.
- Add a per-IP-less rate guard via a trigger that rejects more than N inserts per minute using a small counter table (lightweight, no extra service).
- Hide `reward_code` from any anon SELECT (no SELECT policy exists for anon currently — confirmed — so this is already safe; just adding length limits).

### 5. Repair requests — same hardening
- Add length CHECK constraints on `user_name (100)`, `user_email (255)`, `city (100)`, `country (100)`, plus the message/notes fields.
- Add the same per-minute insert rate guard trigger.
- Note re: PII scoping — the form is consumer-facing from a QR scan, users are not logged in, so we can't add `user_id`. PII access stays admin-only (already the case).

### 6. Scan events / product_views / recommendation_clicks — analytics tables
- Add length limits on text fields (`product_code`, `session_id`, `source`, `referrer`) to prevent payload bloating.
- Add insert rate guard (per minute per session_id).

### 7. API integrations table (admin-only, but hardening)
- Move `api_key` reads behind a security-definer function `get_integration_secret(integration_id)` that only returns the key to admins via edge functions. Frontend admin UI keeps showing masked values only.
- Mark the `api_key` column as not selectable by default by revoking column-level SELECT from `authenticated` and `anon`, granting only to `service_role`.

### 8. Auth hardening
- Enable **Leaked Password Protection (HIBP)** on the auth provider. Currently disabled.
- Confirm OTP expiry is at the recommended 1 hour (not the 24h default).

### 9. What I will NOT change (and why)
- **SELECT `USING (true)` on products / activations / looks / carousels / celebrity_content / campaign_assets / app_settings / platform_settings** — these are intentionally public for the unauthenticated DPP experience. The scanner flags them as a pattern, but they're correct. I'll mark these findings as "ignore" with a clear reason.
- **Public anonymous INSERTs** on `leads`, `repair_requests`, `scan_events` — required for QR-scan flows where users aren't logged in. Mitigation is via length limits + rate guard above, not removal.

## Files / changes

**Database migration** (one migration covering all SQL changes):
- Bucket privacy + storage policy rewrites (repair-photos, look-images)
- CHECK constraints on `leads`, `repair_requests`, `scan_events`, `product_views`, `recommendation_clicks`
- Rate-limit trigger function `public.enforce_insert_rate_limit()` + per-table BEFORE INSERT triggers
- Column-level grants on `api_integrations.api_key`
- New `public.get_integration_secret(uuid)` security-definer function

**Edge function updates**:
- `send-repair-email/index.ts` — use service-role signed URL when including photo links in admin emails (since bucket goes private)
- `capture-lead/index.ts` — surface friendly error when rate-limit trigger fires

**Auth config**:
- Enable HIBP password check via auth settings
- Set OTP expiry to 1 hour

**No changes to**:
- The DPP product page, activations, lead capture form UI (server enforces limits; UI already validates with Zod)

## Outcome
- Scanner: drops from **13 findings** to ~**0–2 informational**. The 5 "RLS policy always true" SELECT findings on public content will be marked "ignore" with documented reasoning (they are intentional for the public DPP).
- Linter: 3 storage warnings cleared, 5 RLS warnings cleared (those that are on INSERT/UPDATE will be tightened; SELECT-public ones marked as accepted).
- DPP user experience: unchanged.
- Admin experience: unchanged except repair photos now load via short-lived signed URLs.

