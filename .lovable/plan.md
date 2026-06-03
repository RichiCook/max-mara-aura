## Problem

The app has one `/auth` page that is worded as an admin dashboard login. When a scanner taps "I own this" (wardrobe) or "Add to wishlist," the flow currently:

- Sends them to `/auth`, which says "Sign in to access the dashboard."
- After sign-up shows a toast: "You can now access the dashboard."
- If they then try the dashboard, they hit a generic `AccessDenied` screen.

The underlying permissions are actually fine — `user_wardrobe` and `user_wishlist` already work for any signed-in user, and the admin dashboard is correctly gated by `has_role('admin')`. The bug is purely UX: scanner sign-up uses the wrong copy and the wrong post-auth destination.

## Goal

Scanners can sign up / sign in to save wishlist and wardrobe items and use their personal account area. They never see admin dashboard language, and they are always returned to where they came from (the product page or `/account`), not to `/`.

## Changes

### 1. Rework `src/pages/AuthPage.tsx` for customer-first messaging
- Default copy: "Welcome" / "Create your account" instead of "Welcome Back" / "access the dashboard."
- Sign-up success toast: "Account created — your saved items are ready" (no mention of dashboard).
- After auth, redirect to `from` if present, otherwise to `/account?tab=wishlist` (not `/`).
- Show a subtle hint line: "Save your wishlist, wardrobe and shared looks across devices."

### 2. Make `WardrobeButton` and `WishlistButton` route consistently
- `WardrobeButton`: keep current behavior, but pass `state.from` set to the current product URL so post-auth lands back on the product (already does this — just confirm).
- `WishlistButton`: today it silently stores guest wishlist in localStorage. Keep that, but when the user taps it while signed out, also show a one-time "Sign in to save it to your account" CTA toast with an action that navigates to `/auth` with `from` set to the product URL. The toggle still works for guests via localStorage merge on sign-in (already implemented in `useWishlist`).

### 3. Update `AccessDenied`
- Reword to: "This area is for administrators." Add two buttons:
  - "Go to my account" → `/account`
  - "Sign out"
- This way a scanner who lands on an admin route by accident isn't dead-ended.

### 4. Customer header / nav touch-ups
- No functional change needed in `UserMenu` — it already only shows wishlist / wardrobe / my account / sign out, never the dashboard.

### 5. Leave alone
- `ProtectedRoute` and the admin route gating in `App.tsx` — admin protection is already correct.
- All Supabase tables, RLS, and roles — no migration needed.
- `useWardrobe` / `useWishlist` hooks — already work correctly for non-admin users.

## Out of scope

- Adding a separate `/admin/login` route (not requested).
- Email verification flow changes.
- Google sign-in copy (kept identical, since it works for both audiences).

## Acceptance

- Tapping "I own this" while signed out → `/auth` page titled "Welcome / Create your account," no "dashboard" wording.
- Signing up there → toast about saved items, redirected back to the product page with the item now in the wardrobe.
- Going to `/account` works; tabs show Wishlist, Wardrobe, Profile.
- Visiting an admin URL as a scanner → friendly "This area is for administrators" with a link back to `/account`.
- Admin users continue to sign in and reach the dashboard exactly as before.
