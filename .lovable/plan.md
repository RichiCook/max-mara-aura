
Goal: fix the product-page layout issue permanently by making custom HTML activations size themselves reliably and by removing extra wrapper spacing that amplifies the problem.

What I found
- The gap in your screenshot is very likely coming from the custom HTML activation iframe, not from the Atelier Compositions cards themselves.
- `CustomHtmlModule.tsx` currently:
  - injects a height bridge, but only posts a “measure now” message instead of the actual height
  - relies on parent-side remeasurement, which is fragile for collapsing content, delayed image/font loads, and animated blocks
  - wraps the iframe in its own `<section className="py-12">`
- `ProductPage.tsx` already wraps activation groups in another padded section (`py-6 sm:py-8`), so custom HTML blocks are getting double vertical spacing on top of the iframe-height problem.
- The product page order matches the saved layout rule, so this should be fixed by stabilizing activation rendering rather than changing section order.

Implementation plan
1. Rebuild the custom HTML height bridge
- Change the injected iframe script so it calculates and posts the actual content height back to the parent.
- Measure multiple sources robustly: `body.scrollHeight`, `body.offsetHeight`, `documentElement.scrollHeight`, `documentElement.offsetHeight`, bounding boxes, and the lowest visible element bottom.
- Trigger re-measurement on:
  - initial load
  - image load
  - font readiness
  - resize
  - click/input/change
  - transition/animation end
  - mutation observer
  - resize observer
  - delayed follow-up timers after interactions

2. Make shrinking reliable
- In the parent, trust the reported height first, then use a guarded fallback measurement only when needed.
- Keep the “shrink then measure” behavior, but make it deterministic so collapsed accordions/toggles reduce height immediately.
- Prevent stale heights by ignoring outdated measurements after `srcDoc` changes or route changes.

3. Remove layout inflation around custom HTML blocks
- Replace the inner `<section className="py-12">` in `CustomHtmlModule` with a neutral wrapper (`div` or fragment).
- Let page-level spacing come from the product page activation wrapper only.
- Keep full-width activations working exactly as they do now.

4. Harden against real-world embedded markup
- Normalize iframe root styles a bit more safely:
  - `html, body { margin: 0; padding: 0; height: auto; min-height: 0; overflow: visible; }`
- Add listeners for late-loading media inside the iframe.
- Re-measure after web fonts settle, because that often changes height after first paint.

5. QA on the exact failing flow
- Test the current product page with the problematic activation:
  - initial render
  - expand
  - collapse
  - expand/collapse several times
  - mobile and desktop widths
- Verify:
  - no internal iframe scrollbars
  - no leftover white gap after collapse
  - no clipping after expansion
  - no extra top/bottom whitespace from duplicated section padding

Files to update
- `src/components/activations/CustomHtmlModule.tsx`
- Possibly a very small cleanup in `src/pages/ProductPage.tsx` only if activation wrapper spacing needs a minor adjustment after the iframe fix

Technical notes
- I would keep the current activation-position system intact (`after_compositions`, `before_heritage`, etc.).
- I would not change the Atelier Compositions section layout unless a second issue appears after the iframe fix.
- If the embedded HTML itself contains huge intentional top padding/margins, I’ll preserve the content and only remove platform-added spacing, not rewrite the activation design.

Expected outcome
- The activation block expands to full content height.
- When it collapses, the page closes back up with no blank space left behind.
- Spacing between Atelier Compositions and the next section becomes consistent and stable across repeated interactions.
