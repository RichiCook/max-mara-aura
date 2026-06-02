
# Wishlist & Wardrobe — Plan

## Quick answer to your question
"How can wishlist work without login?" → it can, by saving the heart-taps to the browser's localStorage. The items live only on that device until the person signs up; on signup we copy them into their account so nothing is lost. I'll use this **guest + merge on signup** pattern as the default — it removes the friction of forcing signup just to favourite something.

---

## What we're building

1. **Real user accounts** — email + password, plus Google sign-in (Lovable Cloud defaults). On signup we create:
   - a Supabase auth user
   - a row in `profiles` (already exists)
   - a row in `leads` with the same email (so marketing/CRM keeps working). If a lead with that email already exists, we link it to the new `user_id` instead of duplicating.

2. **Wishlist** — products the user wants to buy.
   - Heart icon on product cards & product page.
   - Guests: stored in `localStorage`.
   - On login/signup: localStorage items merged into their account (deduped), then cleared.

3. **Wardrobe** — products the user already owns.
   - "I own this" button on the product page (per your choice — manual only, no auto-claim on scan).
   - Optional note field (size, purchase date) for future use; we'll keep the schema ready but the UI starts minimal.

4. **`/account` page** with three tabs:
   - **Wishlist** — grid of saved products, remove button, "move to wardrobe" shortcut.
   - **Wardrobe** — grid of owned products, remove button.
   - **Profile** — name, email, sign out.
   - Accessible from a user avatar in the header (replaces/extends current header on consumer pages).

5. **Header avatar menu** — when logged out: "Sign in". When logged in: avatar → My Account / Sign out.

---

## Technical section

### Database (one migration)

Two new tables, both auth-scoped:

```
user_wishlist (id, user_id, product_id, created_at)
  UNIQUE (user_id, product_id)

user_wardrobe (id, user_id, product_id, note, acquired_at, created_at)
  UNIQUE (user_id, product_id)
```

GRANTs: `authenticated` (full CRUD on own rows), `service_role` (all). No `anon`.

RLS: all four policies scoped to `auth.uid() = user_id`.

`leads` table: add nullable `user_id uuid` column + index, so a lead can be linked to an account when one exists. No data migration needed for existing leads.

### Auth provisioning
Extend the existing `handle_new_user()` trigger to also:
- upsert a `leads` row by email, setting `user_id = NEW.id` (link existing lead if present, else insert a minimal one with `reward_type = 'account_signup'`).

### Frontend
- `useAuth` already exists — add `signInWithGoogle()` via `lovable.auth.signInWithOAuth("google", …)` and enable Google provider.
- New hooks:
  - `useWishlist()` — reads from Supabase when logged in, from localStorage when not. Exposes `toggle(productId)`, `has(productId)`, `items`.
  - `useWardrobe()` — Supabase-only (requires login). Exposes `add`, `remove`, `has`, `items`.
- On `onAuthStateChange(SIGNED_IN)`: read localStorage wishlist, bulk-insert into `user_wishlist` (ignore conflicts), clear localStorage.
- New components:
  - `WishlistButton` (heart) — used on `ProductPreviewCard`, `ProductPage`.
  - `WardrobeButton` ("I own this") — on `ProductPage`.
  - `UserMenu` in header (avatar + dropdown).
- New pages:
  - `/account` with tabs (`Wishlist`, `Wardrobe`, `Profile`) — uses existing `ProductPreviewCard` for grids.
  - `/account` is a protected route; redirects to `/auth` if not signed in.
- `/auth` page: keep current flow, add Google button, add "Create account" tab if not already present.

### Out of scope (call out)
- No sharing/public wishlist URLs.
- No purchase verification for wardrobe — pure self-declared.
- No admin view of wishlists/wardrobes (can add later if needed).
- Existing standalone lead-capture activations keep working unchanged; they just won't create a Supabase auth user (those are still pure marketing captures).

---

## Files touched (rough)

- migration: new tables, RLS, `leads.user_id`, updated `handle_new_user`
- `src/hooks/useWishlist.ts` *(new)*, `src/hooks/useWardrobe.ts` *(new)*
- `src/components/WishlistButton.tsx`, `src/components/WardrobeButton.tsx`, `src/components/UserMenu.tsx` *(new)*
- `src/pages/AccountPage.tsx` *(new)* + route in `App.tsx`
- `src/pages/AuthPage.tsx` — add Google button + signup tab if missing
- `src/hooks/useAuth.ts` — add `signInWithGoogle`
- `src/components/product/*` — wire heart + "I own this" into product page & cards
- header component — mount `UserMenu`

Tap **Implement plan** when you're ready and I'll build it.
