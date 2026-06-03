## Plan

1. Update the Google sign-in flow so it uses a fixed redirect URL instead of a page-specific path.
   - This avoids Google rejecting the request with `redirect_uri_mismatch`.
   - I’ll preserve the intended return page separately so scanners still land back on wishlist/product/account after sign-in.

2. Keep the customer redirect behavior after OAuth.
   - Store the intended destination before sending the user to Google.
   - After the session comes back, redirect to that saved destination or fall back to `/account?tab=wishlist`.

3. Verify the Google provider setup for your own branded credentials.
   - Confirm the exact callback URL in backend auth settings.
   - Make sure the same exact callback is listed in the Google Cloud OAuth client.
   - This is also what prevents Lovable branding from appearing when using your own Google client.

4. Validate the full scanner journey.
   - Signed-out scanner taps save/sign-up with Google.
   - Google auth opens without the mismatch error.
   - After success, the user returns to the correct customer area, not admin/dashboard.

## Technical details

- Current risk in the code: the Google button is passing a dynamic `redirect_uri` based on `from`, which can become paths like product pages or account tabs.
- With your own Google OAuth client, Google expects an exact allowed redirect URI, so dynamic paths can trigger the 400 error you showed.
- I’ll switch the OAuth call to a stable redirect target and keep the post-login destination in app state/session storage instead.
- No database or permissions changes are needed.