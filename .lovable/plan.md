## Problem

When sharing to WhatsApp, the link preview thumbnail (correctly showing the collage) takes the recipient to a **product page** instead of the **look card** page.

## Root cause

In `src/lib/lookShare.ts`, `buildCaption()` produces:

```
{Look name} — shop the look:
• Product A → https://…/p/abc        ← WhatsApp picks THIS for the preview
• Product B → https://…/p/xyz
…
Full look: https://…/look-share-og?…  ← ignored, it's not the first URL
```

WhatsApp's link-preview crawler always uses the **first URL** in the message text. So the preview card image (collage) ends up wired to the first product's link.

## Fix

Reorder `buildCaption()` so the look-share URL is the **first** URL in the message. Product links stay in the message body for users to tap individually:

```
{Look name}

👉 See the full look: https://…/look-share-og?…   ← first URL → preview goes here

Shop each piece:
• Product A → https://…/p/abc
• Product B → https://…/p/xyz
```

That single reorder makes the WhatsApp preview thumbnail open the look card.

## Files changed

- `src/lib/lookShare.ts` — rewrite `buildCaption()` to put the look URL first.

## Out of scope

- No changes to the OG edge function, routes, or the LookSharePage. Those already work correctly — the preview image and the redirect target are both right; we're only fixing which URL WhatsApp picks up.
- No changes to copy-to-clipboard behavior beyond the new caption order (it'll naturally inherit the same improved layout).
