// Server-rendered OG page for "Look" shares.
// Social crawlers (WhatsApp, iMessage, Facebook, Slack) don't run JS, so the
// og:image meta tag set client-side in LookSharePage is invisible to them.
// This function returns HTML with proper OG tags, and redirects real browsers
// to the SPA route /look/share?... so users see the interactive page.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CRAWLER_UA = /(WhatsApp|facebookexternalhit|Facebot|Slackbot|Discordbot|LinkedInBot|Twitterbot|TelegramBot|SkypeUriPreview|Googlebot|bingbot|DuckDuckBot|crawler|spider|bot)/i;

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';

  const name = url.searchParams.get('name') || 'A curated look';
  const desc = url.searchParams.get('desc') || 'Shop this AI-curated look.';
  const img = url.searchParams.get('img') || '';
  const codes = url.searchParams.get('codes') || '';

  // The SPA lives at the project's web origin, not this function's origin.
  // Allow override via ?app= for flexibility; fall back to referer/origin host.
  const appBase = url.searchParams.get('app') || 'https://maxmara.aitems.dev';
  const spaUrl = `${appBase}/look/share?${url.searchParams.toString()}`;

  if (!CRAWLER_UA.test(userAgent)) {
    return Response.redirect(spaUrl, 302);
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(name)} · Look</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(name)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(spaUrl)}" />
${img ? `<meta property="og:image" content="${esc(img)}" />
<meta property="og:image:secure_url" content="${esc(img)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="1200" />
<meta property="og:image:alt" content="${esc(name)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(name)}" />
<meta name="twitter:description" content="${esc(desc)}" />
${img ? `<meta name="twitter:image" content="${esc(img)}" />` : ''}
<meta http-equiv="refresh" content="0; url=${esc(spaUrl)}" />
<link rel="canonical" href="${esc(spaUrl)}" />
<script>
window.location.replace(${JSON.stringify(spaUrl)});
</script>
</head>
<body>
<p>Redirecting… <a href="${esc(spaUrl)}">${esc(name)}</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
});
