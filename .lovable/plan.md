# Smart Photo/Collage Mode for Total Looks

## Behavior
- **Auto-default**: When a look is generated, the system picks Photo or Collage based on admin-configurable rules (no manual choice needed up front).
- **Always switchable**: Once a look exists in either mode, the user can switch via the toggle. If the other mode hasn't been generated yet, clicking it triggers generation on demand. So a Collage look can always have its Photo generated, and vice versa.

## Admin-configurable rule (app_settings)
New `app_settings` row `id = 'look_mode_rules'` with JSON value:
```json
{
  "default_mode": "auto",            // "auto" | "photo" | "collage"
  "rule": "category_mix",            // "category_mix" | "product_count" | "fixed"
  "apparel_categories": ["dress","coat","top","skirt","pants","suit","jacket"],
  "count_threshold": 4                // <threshold => collage, >=threshold => photo
}
```

Logic per look at generation time:
- `fixed` → always use `default_mode`.
- `category_mix` → if any product category is in `apparel_categories` → Photo; else Collage.
- `product_count` → `productIds.length >= count_threshold` → Photo, else Collage.

## UI changes
- **Admin Settings page** (existing settings area): new "Total Look Mode" panel — pick rule, edit apparel category list, edit count threshold. Saved into `app_settings`.
- **LookCardV2**: Photo/Collage toggle always visible. If selected mode not yet generated → show inline "Generate" CTA + spinner; otherwise render image. Photo uses `object-cover`, Collage uses `object-contain`.
- **ProductGeneratedLook / generation flow**: on initial generate, call the auto-selected edge function (`generate-look-image` or `generate-look-collage`) based on the rule. The other one stays available on-demand.

## Files to change
- `supabase/migrations/<new>.sql` — insert default `look_mode_rules` row in `app_settings`.
- `src/lib/lookMode.ts` (new) — `resolveLookMode(products, settings)` helper.
- `src/hooks/useAppSettings.ts` (or equivalent) — read `look_mode_rules`.
- `src/components/ProductGeneratedLook.tsx` — call resolver, route to correct generator, allow on-demand generation of the other mode.
- `src/components/product/LookCardV2.tsx` — toggle always shown; lazy-generate missing mode.
- `src/components/admin/LookModeSettings.tsx` (new) + wire into existing admin settings page.

## Data
No schema change beyond seeding `app_settings`. `generated_look` JSONB already holds both `look_image` and `collage_image`.
