

## Goal
Strip every visible/source reference to "Lovable" from the project so a competitor inspecting the site, viewing source, or reading the codebase can't tell what built it. Keep the underlying functionality intact (the AI gateway and Cloud still work — only labels and exposed strings change).

## What stays (technical, non-revealing)
These MUST stay or things break, but none of them surface "Lovable" to a visitor:
- `LOVABLE_API_KEY` env var name and `https://ai.gateway.lovable.dev/...` calls inside edge functions (server-side only, never reaches the browser).
- The `lovable-tagger` dev dependency in `package.json` — only loaded in `mode === "development"`, never in the production build.
- `.lovable/` internal memory folder (not shipped).

## What gets removed/renamed (visible surface)

### A. Public HTML — `index.html`
- `<meta name="author" content="Lovable">` → `<meta name="author" content="Christian Louboutin">`
- `<meta name="twitter:site" content="@Lovable">` → remove the tag entirely (no Twitter handle to substitute)
- Two OG/Twitter image URLs that point at `…lovable.app-…png` on R2 → re-host or replace. Plan: download the current OG image once, re-upload to Supabase Storage under a neutral path (e.g. `public-assets/og-cover.png`), and swap both `<meta>` URLs to that public Supabase URL. Falls back to `/favicon.png` if upload isn't possible.

### B. Admin UI — `src/components/api/SecretsPanel.tsx`
- "Lovable AI (Text)" → "AI Text Generation"
- Description "Powers AI text generation…" stays
- helpText "Learn more about Lovable AI" → remove (drop the `helpText`/`helpUrl` props)
- storageNote "automatically managed by Lovable Cloud…" → "Managed by the platform and cannot be modified."
- Resend storageNote "Stored securely in Lovable Cloud…" → "Stored securely in the platform vault. Contact support to update."

### C. Export PDF fallback — `src/utils/exportUtils.ts`
- `baseUrl || 'https://loubotin.lovable.app'` → `baseUrl || 'https://louboutin.aitems.dev'` (the custom domain you already own, per project URLs).

### D. README — `README.md`
- Replace the entire contents with a short, neutral project README:
  ```
  # Christian Louboutin × Aura
  Digital Product Passport platform.
  
  ## Stack
  Vite · React · TypeScript · Tailwind · shadcn/ui · Supabase
  
  ## Local development
  npm i
  npm run dev
  ```
  No mention of how it was built or where it's hosted.

### E. Edge function User-Agent strings (low priority but visible to scraped sites)
- `supabase/functions/scrape-campaigns/index.ts` UA `"Mozilla/5.0 (compatible; Lovable Campaign Scraper)"` → `"Mozilla/5.0 (compatible; AitemsBot)"`
- `supabase/functions/export-image-proxy/index.ts` UA `"Mozilla/5.0 (compatible; Lovable Export Proxy)"` → `"Mozilla/5.0 (compatible; AitemsProxy)"`
- Edge-function error message "Please add funds to your Lovable AI workspace." (in `generate-look-for-product` and `generate-looks`) → "AI service quota exceeded. Please contact support."

### F. Already handled
- "Edit with Lovable" badge on the published site is already hidden (verified via publish settings — `hide_badge: true`). No action needed.

## What we deliberately do NOT touch
- `package.json` / `package-lock.json` `lovable-tagger` entries — removing it would break dev tooling. It is dev-only, tree-shaken out of production bundles, and never appears in the live HTML/JS a competitor can inspect.
- Edge-function internals (`LOVABLE_API_KEY`, `ai.gateway.lovable.dev`) — server-side only. A competitor viewing the deployed site cannot see these. Renaming the env var requires re-provisioning and would break the AI gateway.
- `.lovable/` memory directory — internal, not deployed.

## Files changed
1. `index.html` — meta tags + OG image URLs
2. `src/components/api/SecretsPanel.tsx` — labels and storage notes
3. `src/utils/exportUtils.ts` — fallback URL
4. `README.md` — full rewrite
5. `supabase/functions/scrape-campaigns/index.ts` — User-Agent
6. `supabase/functions/export-image-proxy/index.ts` — User-Agent
7. `supabase/functions/generate-look-for-product/index.ts` — error message
8. `supabase/functions/generate-looks/index.ts` — error message

## Note on the "lovable.app" OG image URL
The current OG image is hosted at a `…lovable.app-….png` filename on R2. Even though the domain is `pub-…r2.dev`, the *filename* contains "lovable.app". I'll re-host it to a Supabase Storage public URL with a clean filename so the OG preview a competitor sees on social shares contains zero "lovable" strings.

## Honest caveat
After these changes, the *deployed* site (HTML, JS bundles, network responses, OG previews) will contain no "Lovable" references. The GitHub repo will still contain `lovable-tagger` in `package.json` and the edge-function `LOVABLE_API_KEY`/`ai.gateway.lovable.dev` strings — these are unavoidable without breaking the build. If the repo is private, competitors can't see them. If the repo is public, full obfuscation isn't possible without re-architecting the AI calls through a self-hosted proxy.

