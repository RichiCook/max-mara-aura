# Plan

## 1. Auto-suggest sign up when login fails (no account)

In `src/pages/AuthPage.tsx`, when `signInWithPassword` returns "Invalid login credentials":
- Show a toast: "No account found — switching to sign up"
- Automatically flip `isSignUp` to `true` and keep the email/password the user already typed so they can submit directly
- Keep current behavior for other errors

Note: Supabase doesn't differentiate "wrong password" vs "no user" for security. We'll treat `Invalid login credentials` as "likely no account" and prompt sign up. A small helper link "Wrong password? Try again" will let users flip back.

## 2. Redirect after email confirmation back to scan landing

Currently `signUp` sets `emailRedirectTo: ${origin}/` which lands on the admin dashboard root (or `/#`).

Fix:
- When the user arrives at `/auth` from a product/scan page, capture the originating path (already done via `location.state.from` and `sessionStorage.postAuthRedirect`).
- Persist that path into the signup confirmation URL by passing it as a query param: `emailRedirectTo: ${origin}/auth?redirect=<encoded path>`
- In `AuthPage` `useEffect`, when a session becomes available and `?redirect=` is present in the URL, navigate there (replacing history). This handles both the post-email-confirmation return and ordinary in-tab sign-ins.
- Fallback chain for destination: `?redirect=` query → `sessionStorage.postAuthRedirect` → `location.state.from` → `/account?tab=wishlist`.

## Files to change

- `src/pages/AuthPage.tsx` — only file touched. Pure frontend change.

## Out of scope

- No backend, RLS, or edge function changes.
- No change to the Supabase email template (the `{{ .ConfirmationURL }}` already honors `emailRedirectTo`).
