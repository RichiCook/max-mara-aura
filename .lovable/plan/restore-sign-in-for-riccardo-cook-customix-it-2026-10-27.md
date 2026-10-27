# Restore sign-in for riccardo.cook@customix.it

## What I found
- The account exists, its email is confirmed, and it has the **admin** role. Last sign-in: 4 June 2026.
- The app's login screen is pointed at a different backend from the one that holds your account. That means the correct password still gets rejected.

## Steps
1. Reconnect the app to the right backend so the login screen checks the database where your account is stored. This is done through the platform's connection refresh, not by editing settings by hand.
2. Add a **"Forgot password?"** link on the login page. It sends a reset email and opens a page where you set a new password. Sign-up stays disabled.
3. Test it: sign the preview in as riccardo.cook@customix.it and check that the admin dashboard opens.

## Technical details
- The client `.env` points at ref `zwpeeoqmykppiojdelzh`, but the Cloud instance is `vifbscpxguafvhccybhq`. Fix this by regenerating the connection, without editing `.env` by hand.
- Add a `/reset-password` public route that uses `supabase.auth.resetPasswordForEmail` with `redirectTo: ${origin}/reset-password` and `updateUser({ password })`.
