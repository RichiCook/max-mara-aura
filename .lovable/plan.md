## Goal
Add the API keys you listed as Lovable Cloud secrets so edge functions can use them.

## Secrets to add
1. `OPENAI_API_KEY` — OpenAI (image/text)
2. `REPLICATE_API_KEY` — Replicate image provider
3. `RUNWARE_API_KEY` — Runware image provider
4. `FIRECRAWL_API_KEY` — replace the current browser-localStorage Firecrawl key with a server-side secret used by `firecrawl-discover-products` and any other Firecrawl edge functions
5. `HUGGING_FACE_ACCESS_TOKEN` — Hugging Face image provider
6. `RESEND_API_KEY` — used by `send-repair-email`, `capture-lead`, `process-email-queue`
7. `RESEND_FROM_EMAIL` — sender address for repair + lead emails (e.g. `noreply@yourdomain.com`, must be a verified Resend domain)
8. `GOOGLE_API_KEY` — Gemini key from https://aistudio.google.com/apikey, for swapping Gemini calls off the Lovable AI gateway to direct Google API

## Execution
Once you switch to build mode I'll trigger the secrets form once with all 8 names; you paste the values in the secure dialog. Nothing is written to code or `.env`.

## Follow-up (optional, ask after secrets are in)
- Wire `RESEND_FROM_EMAIL` into `send-repair-email` / `capture-lead` / `process-email-queue` (currently hardcoded sender, presumably `onboarding@resend.dev` or similar).
- Migrate Firecrawl from `localStorage` (in `FirecrawlService` / `SecretsPanel`) to read `FIRECRAWL_API_KEY` from edge functions only, and remove the client key UI.
- Swap Gemini calls in edge functions from `ai.gateway.lovable.dev` to `generativelanguage.googleapis.com` using `GOOGLE_API_KEY`.

Confirm and I'll proceed; let me know if any of these follow-up wirings should be part of this same task.