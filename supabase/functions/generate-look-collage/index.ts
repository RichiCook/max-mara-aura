import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------- AI composition pipeline (Atelier-style) ----------
// Toggle: set COLLAGE_MODE=cutout in edge function secrets to fall back to the
// legacy deterministic cutout grid below. Default is the AI still-life pipeline.

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function aiFetchImageAsBase64(url: string, supabaseUrl: string): Promise<string> {
  const proxyUrl = `${supabaseUrl}/functions/v1/export-image-proxy?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl, { headers: { Accept: 'image/*' } });
  if (resp.ok) {
    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  }
  const direct = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: new URL(url).origin + '/',
    },
  });
  if (!direct.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = await direct.arrayBuffer();
  const contentType = direct.headers.get('content-type') || 'image/jpeg';
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}

async function hashCacheKey(urls: string[]): Promise<string> {
  const joined = [...urls].sort().join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(joined));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 24);
}

function buildAiCollagePrompt(productNames: string, count: number): string {
  return `You are given ${count} product photographs of fashion garments and accessories. Create a single elegant still-life flat-lay photograph that arranges ALL of these EXACT products together on a shared surface, as if styled for an editorial "look" feature.

Background: warm soft neutral (#f0ece7), like a styled atelier surface.
Style: Vogue / Harper's Bazaar editorial still life — refined, considered, luxurious.
Layout: products arranged with breathing room, natural slight overlaps, gentle cast shadows from soft top light.
Aspect ratio: square 1:1.

ABSOLUTE RULES — VIOLATIONS WILL MAKE THE IMAGE UNUSABLE:
1. Reproduce each product EXACTLY as it appears in the reference photos — same shape, same color, same fabric, same hardware, same design details. Do NOT invent, alter, or reimagine any product.
2. Every single product must be FULLY visible — no cropping, no cutting off at the edges.
3. Do NOT add any products that are not in the reference images.
4. Do NOT change the color or design of any product.
5. No text, no logos, no watermarks, no decorative props (no flowers, no jewelry, no perfume bottles unless they are in the references).
6. Professional studio lighting, ultra-high quality, photorealistic.
7. Products should have breathing room — don't push them to the edges of the frame.

The products in the reference images are: ${productNames}.`;
}

async function runAiCollage(products: ProductInfo[]): Promise<{ image: string; debug: Array<Record<string, unknown>> }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const sources = products
    .map((p) => ({ name: p.name, url: (p.trusted_image || p.image || '').trim() }))
    .filter((p) => !!p.url);

  if (sources.length < 2) {
    throw new Error('AI collage needs at least 2 product images');
  }

  // Content-addressed cache: identical product set => same file
  const cacheKey = await hashCacheKey(sources.map((s) => s.url));
  const filePath = `looks/${cacheKey}.png`;
  const { data: existing } = await supabase.storage
    .from('look-images')
    .list('looks', { search: `${cacheKey}.png` });
  if (existing && existing.length > 0) {
    const { data: pub } = supabase.storage.from('look-images').getPublicUrl(filePath);
    return {
      image: `${pub.publicUrl}?t=${Date.now()}`,
      debug: [{ status: 'cache_hit', cache_key: cacheKey, products: sources.map((s) => s.name) }],
    };
  }

  // Fetch all product images as base64
  const imageContents: Array<{ type: 'image_url'; image_url: { url: string } }> = [];
  const fetched: string[] = [];
  for (const s of sources) {
    try {
      const b64 = await aiFetchImageAsBase64(s.url, supabaseUrl);
      imageContents.push({ type: 'image_url', image_url: { url: b64 } });
      fetched.push(s.name);
    } catch (e) {
      console.error(`AI collage: failed to fetch ${s.name}:`, e);
    }
  }
  if (imageContents.length < 2) {
    throw new Error('AI collage: could not fetch enough product images');
  }

  const prompt = buildAiCollagePrompt(fetched.join(', '), imageContents.length);

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imageContents] }],
      modalities: ['image', 'text'],
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error('AI gateway error:', aiResp.status, errText);
    if (aiResp.status === 429) throw new Error('Rate limit reached, please try again shortly.');
    if (aiResp.status === 402) throw new Error('AI credits exhausted.');
    throw new Error(`AI gateway error: ${aiResp.status}`);
  }

  const data = await aiResp.json();
  const dataUrl: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error('AI returned no image');

  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const raw = atob(base64Data);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  const { error: uploadErr } = await supabase.storage
    .from('look-images')
    .upload(filePath, bytes, { contentType: 'image/png', upsert: true });
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: pub } = supabase.storage.from('look-images').getPublicUrl(filePath);
  return {
    image: `${pub.publicUrl}?t=${Date.now()}`,
    debug: [{ status: 'ai_generated', cache_key: cacheKey, products: fetched }],
  };
}

async function shrinkImageBase64(dataUrl: string, maxWidth = 768): Promise<string> {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return dataUrl;
    const b64 = match[2];
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const img = (await decode(bytes)) as Image;
    if (img.width <= maxWidth) return dataUrl;
    const ratio = maxWidth / img.width;
    img.resize(maxWidth, Math.round(img.height * ratio));
    const encoded = await img.encodeJPEG(80);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < encoded.length; i += chunk) {
      binary += String.fromCharCode(...encoded.subarray(i, i + chunk));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  } catch (e) {
    console.warn('shrinkImageBase64 failed, using original:', e);
    return dataUrl;
  }
}

/**
 * Quick mode: parallel reference fetches, shrunken refs, streaming AI generation.
 * Returns an SSE Response emitting `event: collage` frames:
 *   { type: 'partial', image: 'data:image/...' }   (zero or more)
 *   { type: 'final',   image: '<storage url>', debug: [...] }
 *   { type: 'error',   error: '...' }              (terminal on failure)
 */
async function runAiCollageQuickStream(products: ProductInfo[]): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const sources = products
    .map((p) => ({ name: p.name, url: (p.trusted_image || p.image || '').trim() }))
    .filter((p) => !!p.url);

  const encoder = new TextEncoder();
  const sseHeaders = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: collage\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
        if (sources.length < 2) throw new Error('AI collage needs at least 2 product images');

        const cacheKey = await hashCacheKey(sources.map((s) => s.url));
        const filePath = `looks/${cacheKey}.png`;
        const { data: existing } = await supabase.storage
          .from('look-images')
          .list('looks', { search: `${cacheKey}.png` });
        if (existing && existing.length > 0) {
          const { data: pub } = supabase.storage.from('look-images').getPublicUrl(filePath);
          send({ type: 'final', image: `${pub.publicUrl}?t=${Date.now()}`, debug: [{ status: 'cache_hit', cache_key: cacheKey }] });
          controller.close();
          return;
        }

        // Parallel fetch + shrink references
        const fetchOne = async (s: { name: string; url: string }) => {
          const b64 = await aiFetchImageAsBase64(s.url, supabaseUrl);
          const shrunk = await shrinkImageBase64(b64);
          return { name: s.name, b64: shrunk };
        };
        const settled = await Promise.allSettled(sources.map(fetchOne));
        const imageContents: Array<{ type: 'image_url'; image_url: { url: string } }> = [];
        const fetched: string[] = [];
        for (const r of settled) {
          if (r.status === 'fulfilled') {
            imageContents.push({ type: 'image_url', image_url: { url: r.value.b64 } });
            fetched.push(r.value.name);
          } else {
            console.error('AI collage quick: fetch failed:', r.reason);
          }
        }
        if (imageContents.length < 2) throw new Error('AI collage: could not fetch enough product images');

        const prompt = buildAiCollagePrompt(fetched.join(', '), imageContents.length);

        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image-preview',
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imageContents] }],
            modalities: ['image', 'text'],
            stream: true,
          }),
        });

        if (!aiResp.ok || !aiResp.body) {
          const errText = await aiResp.text().catch(() => '');
          if (aiResp.status === 429) throw new Error('Rate limit reached, please try again shortly.');
          if (aiResp.status === 402) throw new Error('AI credits exhausted.');
          throw new Error(`AI gateway error: ${aiResp.status} ${errText}`);
        }

        const reader = aiResp.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        let lastImage: string | null = null;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let sepIdx: number;
          while ((sepIdx = buf.indexOf('\n\n')) !== -1) {
            const rawEvent = buf.slice(0, sepIdx);
            buf = buf.slice(sepIdx + 2);
            const dataLines = rawEvent
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trim());
            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join('\n');
            if (dataStr === '[DONE]') continue;
            try {
              const evt = JSON.parse(dataStr);
              if (evt.type === 'image_generation.partial_image' && evt.b64_json) {
                const img = `data:image/png;base64,${evt.b64_json}`;
                lastImage = img;
                send({ type: 'partial', image: img });
              } else if (evt.type === 'image_generation.completed' && evt.b64_json) {
                lastImage = `data:image/png;base64,${evt.b64_json}`;
              } else if (evt.choices?.[0]?.delta?.images?.[0]?.image_url?.url) {
                const img = evt.choices[0].delta.images[0].image_url.url;
                lastImage = img;
                send({ type: 'partial', image: img });
              } else if (evt.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
                lastImage = evt.choices[0].message.images[0].image_url.url;
              }
            } catch {
              // ignore heartbeats / non-JSON
            }
          }
        }

        if (!lastImage) throw new Error('AI returned no image');

        const base64Data = lastImage.replace(/^data:image\/\w+;base64,/, '');
        const raw = atob(base64Data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const { error: uploadErr } = await supabase.storage
          .from('look-images')
          .upload(filePath, bytes, { contentType: 'image/png', upsert: true });
        let finalUrl = lastImage;
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('look-images').getPublicUrl(filePath);
          finalUrl = `${pub.publicUrl}?t=${Date.now()}`;
        }
        send({ type: 'final', image: finalUrl, debug: [{ status: 'ai_generated_quick', cache_key: cacheKey, products: fetched }] });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        try {
          controller.enqueue(encoder.encode(`event: collage\ndata: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
        } catch {
          // ignore
        }
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders });
}

interface ProductInfo {
  name: string;
  color: string | null;
  category: string | null;
  image: string | null;
  // Optional admin-trusted URL that bypasses the strict packshot allow list.
  // Used when an admin has manually approved a specific lay-flat image.
  trusted_image?: string | null;
}


// ---------- Image source validation ----------

function isShoeCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes('shoe') || c.includes('scarpe') || c.includes('boot') ||
    c.includes('stival') || c.includes('sandal') || c.includes('sneaker') ||
    c.includes('mocassin') || c.includes('loafer') || c.includes('décolleté') ||
    c.includes('decollete') || c.includes('pump') || c.includes('heel') ||
    c.includes('ciabatt') || c.includes('slide');
}

function isBagOrAccessory(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes('borsa') || c.includes('bag') || c.includes('pochette') ||
    c.includes('clutch') || c.includes('tote') || c.includes('shopper') ||
    c.includes('cintura') || c.includes('belt') || c.includes('foulard') ||
    c.includes('sciarpa') || c.includes('scarf') || c.includes('cappello') ||
    c.includes('hat') || c.includes('guant') || c.includes('glove') ||
    c.includes('occhial') || c.includes('glasses') || c.includes('bijou') ||
    c.includes('gioiell') || c.includes('jewel');
}

// Returns true ONLY for clean flat-lay / packshot URLs that are safe to send to
// the background-removal cutout pipeline. Anything else (worn, detail, lifestyle,
// alt, crop, swatch, model) is rejected outright. This is the source of truth —
// the backend never trusts the frontend's selection.
function isAllowedPackshot(url: string, category: string | null | undefined): boolean {
  const lower = url.toLowerCase();
  if (!lower.startsWith('http') && !lower.startsWith('data:')) return false;

  // Generic reject list — applies to all sources
  if (lower.includes('_alt') || lower.includes('_model') || lower.includes('_worn') ||
      lower.includes('_lifestyle') || lower.includes('_crop') || lower.includes('_detail') ||
      lower.includes('_closeup') || lower.includes('_close_up') || lower.includes('_zoom') ||
      lower.includes('#thumbnail')) {
    return false;
  }

  // Max Mara: must be /s3master/ and the variant code must match category rules
  if (lower.includes('maxmara.com')) {
    if (lower.includes('/s3swatch/')) return false; // colour swatches
    if (!lower.includes('/s3master/')) return false; // s3details = on-body
    if (!lower.includes('_normal.')) return false;
    const variantMatch = lower.match(/-([a-z])-[^/_?#]+_normal\./);
    const variant = variantMatch?.[1] ?? null;
    if (!variant) return false;
    // 'a' = clean packshot for apparel/bags/accessories
    // 'w' = additional packshot used for shoes
    if (variant === 'a') return true;
    if (variant === 'w' && isShoeCategory(category)) return true;
    return false;
  }

  // Champion / generic patterns: only the plain _Full shot or _Full_Front
  if (/_full\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower)) return true;
  if (/_full_front\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower)) return true;

  return false;
}

// Rewrite a Max Mara URL into its canonical /s3master/-a- (or -w- for shoes)
// packshot. Returns null if the URL doesn't look like a Max Mara product image.
function deriveMaxMaraPackshot(url: string, category: string | null | undefined): string | null {
  if (!url.toLowerCase().includes('maxmara.com')) return null;
  const preferred = isShoeCategory(category) ? 'w' : 'a';
  const rewritten = url
    .replace('/s3details/', '/s3master/')
    .replace('/s3swatch/', '/s3master/')
    .replace(/-([a-z])-([^/_?#]+_normal\.)/i, `-${preferred}-$2`);
  return rewritten !== url ? rewritten : null;
}

interface PackshotSelection {
  url: string | null;
  considered: string[];
  rejected: string[];
}

function selectPackshotCandidates(rawUrl: string, category: string | null | undefined): PackshotSelection {
  const raw = rawUrl
    .split(/\r?\n/)
    .map((u) => u.split('#')[0].trim())
    .filter(Boolean);

  const considered: string[] = [];
  const rejected: string[] = [];
  const allowed: string[] = [];

  for (const candidate of raw) {
    considered.push(candidate);
    if (isAllowedPackshot(candidate, category)) {
      allowed.push(candidate);
      continue;
    }
    // Try to rewrite Max Mara URLs into their canonical packshot
    const derived = deriveMaxMaraPackshot(candidate, category);
    if (derived && isAllowedPackshot(derived, category)) {
      allowed.push(derived);
    } else {
      rejected.push(candidate);
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const ordered = allowed.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

  return { url: ordered[0] ?? null, considered, rejected };
}

// ---------- Image fetching ----------

async function fetchImageBytes(rawUrl: string, category: string | null | undefined): Promise<{ bytes: Uint8Array | null; usedUrl: string | null; selection: PackshotSelection }> {
  const selection = selectPackshotCandidates(rawUrl, category);
  if (!selection.url) {
    return { bytes: null, usedUrl: null, selection };
  }

  // Reorder so the canonical packshot is tried first, then any other allowed candidate
  const candidates = [selection.url];
  for (const c of rawUrl.split(/\r?\n/).map((u) => u.split('#')[0].trim()).filter(Boolean)) {
    if (isAllowedPackshot(c, category) && !candidates.includes(c)) candidates.push(c);
    const derived = deriveMaxMaraPackshot(c, category);
    if (derived && isAllowedPackshot(derived, category) && !candidates.includes(derived)) candidates.push(derived);
  }

  for (const cleanUrl of candidates) {
    try {
      if (cleanUrl.startsWith('data:')) {
        const [, b64] = cleanUrl.split(',');
        if (!b64) continue;
        return { bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), usedUrl: cleanUrl, selection };
      }
      const parsed = new URL(cleanUrl);
      const upstream = await fetch(parsed.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'referer': `${parsed.origin}/`,
        },
      });
      if (!upstream.ok) {
        console.warn(`Packshot fetch failed (${upstream.status}): ${cleanUrl}`);
        continue;
      }
      return { bytes: new Uint8Array(await upstream.arrayBuffer()), usedUrl: cleanUrl, selection };
    } catch (err) {
      console.warn(`Packshot fetch error for ${cleanUrl}:`, err);
    }
  }
  return { bytes: null, usedUrl: null, selection };
}

// ---------- Background removal (deterministic, no AI) ----------

// Background-aware cutout with edge decontamination.
// Instead of a hard threshold mask, estimate the true studio backdrop color
// from the image border, flood-fill only pixels that are close to that sampled
// backdrop, then feather + decontaminate RGB along the edge so white halos do
// not remain around garments and accessories.
function removeBackground(img: Image): Image {
  const w = img.width;
  const h = img.height;
  const total = w * h;

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgSamples = 0;

  const sampleBorderPixel = (x: number, y: number) => {
    const px = img.getPixelAt(x + 1, y + 1);
    bgR += (px >> 24) & 0xff;
    bgG += (px >> 16) & 0xff;
    bgB += (px >> 8) & 0xff;
    bgSamples += 1;
  };

  for (let x = 0; x < w; x++) {
    sampleBorderPixel(x, 0);
    sampleBorderPixel(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    sampleBorderPixel(0, y);
    sampleBorderPixel(w - 1, y);
  }

  const backdropR = bgSamples > 0 ? bgR / bgSamples : 238;
  const backdropG = bgSamples > 0 ? bgG / bgSamples : 236;
  const backdropB = bgSamples > 0 ? bgB / bgSamples : 232;

  // Step 1: compute how close each pixel is to the sampled backdrop.
  const bgScore = new Uint8Array(total);
  const rCh = new Uint8Array(total);
  const gCh = new Uint8Array(total);
  const bCh = new Uint8Array(total);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = img.getPixelAt(x + 1, y + 1);
      const r = (px >> 24) & 0xff;
      const g = (px >> 16) & 0xff;
      const b = (px >> 8) & 0xff;
      const idx = y * w + x;
      rCh[idx] = r; gCh[idx] = g; bCh[idx] = b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;
      const dist = Math.sqrt(
        (r - backdropR) * (r - backdropR) +
        (g - backdropG) * (g - backdropG) +
        (b - backdropB) * (b - backdropB)
      );
      const backdropSimilarity = Math.max(0, Math.min(1, 1 - dist / 72));
      const lightnessBias = Math.max(0, Math.min(1, (max - 185) / 70));
      const chromaBias = Math.max(0, Math.min(1, 1 - chroma / 28));
      bgScore[idx] = Math.round(backdropSimilarity * 0.65 * 255 + lightnessBias * chromaBias * 0.35 * 255);
    }
  }

  // Step 2: flood-fill from borders through pixels that resemble the backdrop.
  const isBg = new Uint8Array(total);
  const stack: number[] = [];
  const tryPush = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (isBg[idx]) return;
    if (bgScore[idx] >= 132) {
      isBg[idx] = 1;
      stack.push(x, y);
    }
  };
  for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
  for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }
  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    tryPush(x + 1, y); tryPush(x - 1, y);
    tryPush(x, y + 1); tryPush(x, y - 1);
  }

  // Step 3: build a soft alpha ramp near the extracted edge.
  const alpha = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (isBg[i]) {
      alpha[i] = 0;
    } else {
      const s = bgScore[i];
      alpha[i] = s <= 84 ? 255 : Math.round(255 * (1 - (s - 84) / 171));
    }
  }

  // Step 4: erode by 1px to keep the edge slightly inside the object.
  const eroded = new Uint8Array(total);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let m = alpha[idx];
      if (x > 0) m = Math.min(m, alpha[idx - 1]);
      if (x < w - 1) m = Math.min(m, alpha[idx + 1]);
      if (y > 0) m = Math.min(m, alpha[idx - w]);
      if (y < h - 1) m = Math.min(m, alpha[idx + w]);
      eroded[idx] = m;
    }
  }

  // Step 5: blur alpha for anti-aliasing.
  const blur = (src: Uint8Array): Uint8Array => {
    const out = new Uint8Array(total);
    // horizontal
    const tmp = new Uint8Array(total);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const a = x > 0 ? src[idx - 1] : src[idx];
        const b = src[idx];
        const c = x < w - 1 ? src[idx + 1] : src[idx];
        tmp[idx] = (a + b + c) / 3;
      }
    }
    // vertical
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const a = y > 0 ? tmp[idx - w] : tmp[idx];
        const b = tmp[idx];
        const c = y < h - 1 ? tmp[idx + w] : tmp[idx];
        out[idx] = (a + b + c) / 3;
      }
    }
    return out;
  };
  let finalAlpha = blur(eroded);
  finalAlpha = blur(finalAlpha);

  // Step 6: estimate nearby foreground colour so edge pixels are decontaminated
  // from the sampled studio background rather than keeping a white fringe.
  const decontaminate = (channel: number, backdrop: number, alphaValue: number) => {
    if (alphaValue >= 250) return channel;
    const a = Math.max(alphaValue / 255, 0.08);
    const unmatted = Math.round((channel - backdrop * (1 - a)) / a);
    return Math.max(0, Math.min(255, unmatted));
  };

  // Step 7: write back to image.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const a = finalAlpha[idx];
      if (a === 0) {
        img.setPixelAt(x + 1, y + 1, 0);
      } else {
        const r = decontaminate(rCh[idx], backdropR, a);
        const g = decontaminate(gCh[idx], backdropG, a);
        const b = decontaminate(bCh[idx], backdropB, a);
        img.setPixelAt(x + 1, y + 1,
          ((r & 0xff) << 24) |
          ((g & 0xff) << 16) |
          ((b & 0xff) << 8)  |
          (a & 0xff)
        );
      }
    }
  }

  return img;
}

// Crop transparent margins so each cutout sits tight in its bounding box.
function trimTransparent(img: Image): Image {
  const w = img.width;
  const h = img.height;
  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixel = img.getPixelAt(x + 1, y + 1);
      const a = pixel & 0xff;
      if (a > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return img;
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  return img.crop(minX, minY, cw, ch);
}

// ---------- Drop shadow ----------

function applyDropShadow(canvas: Image, cutout: Image, dx: number, dy: number, opacity: number) {
  const w = cutout.width;
  const h = cutout.height;
  const offsets = [
    [0, 0, 1.0],
    [-2, 0, 0.5], [2, 0, 0.5], [0, -2, 0.5], [0, 2, 0.5],
    [-3, -3, 0.3], [3, -3, 0.3], [-3, 3, 0.3], [3, 3, 0.3],
  ];
  for (const [ox, oy, mul] of offsets) {
    const shadow = new Image(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = cutout.getPixelAt(x + 1, y + 1) & 0xff;
        if (a > 0) {
          const newA = Math.round((a / 255) * opacity * (mul as number) * 0.35 * 255);
          if (newA > 0) {
            shadow.setPixelAt(x + 1, y + 1, (0x14 << 24) | (0x14 << 16) | (0x14 << 8) | newA);
          }
        }
      }
    }
    canvas.composite(shadow, dx + (ox as number), dy + (oy as number));
  }
}

// ---------- Main compositor ----------

interface Cutout { img: Image; productIndex: number }

interface CollageDebugItem {
  name: string;
  category: string | null;
  status: 'used' | 'no_valid_packshot' | 'fetch_failed' | 'decode_failed' | 'skipped';
  used_url?: string;
  considered: string[];
  rejected: string[];
}

async function decodeProduct(p: ProductInfo, idx: number, debug: CollageDebugItem[]): Promise<Cutout | null> {
  if (!p.image && !p.trusted_image) {
    debug[idx].status = 'skipped';
    return null;
  }
  const tryDecode = async (bytes: Uint8Array): Promise<Image | null> => {
    try {
      const d = await decode(bytes);
      if (!(d instanceof Image)) return null;
      let img = d as Image;
      const maxSide = Math.max(img.width, img.height);
      if (maxSide > 900) {
        const scale = 900 / maxSide;
        img = img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
      }
      img = removeBackground(img);
      img = trimTransparent(img);
      if (img.width < 8 || img.height < 8) return null;
      return img;
    } catch (err) {
      console.warn('Decode failed:', err);
      return null;
    }
  };

  // Trusted (admin-approved) image first — no strict validation
  if (p.trusted_image) {
    try {
      const parsed = new URL(p.trusted_image);
      const upstream = await fetch(parsed.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'referer': `${parsed.origin}/`,
        },
      });
      if (upstream.ok) {
        const bytes = new Uint8Array(await upstream.arrayBuffer());
        const img = await tryDecode(bytes);
        if (img) {
          debug[idx].used_url = p.trusted_image;
          debug[idx].considered = [p.trusted_image];
          debug[idx].status = 'used';
          return { img, productIndex: idx };
        }
      }
    } catch (err) {
      console.warn(`Trusted image fetch failed for "${p.name}":`, err);
    }
  }

  if (!p.image) {
    debug[idx].status = 'no_valid_packshot';
    return null;
  }
  const { bytes, usedUrl, selection } = await fetchImageBytes(p.image, p.category);
  debug[idx].considered = selection.considered;
  debug[idx].rejected = selection.rejected;
  if (!selection.url) { debug[idx].status = 'no_valid_packshot'; return null; }
  if (!bytes) { debug[idx].status = 'fetch_failed'; return null; }
  debug[idx].used_url = usedUrl ?? selection.url;
  const img = await tryDecode(bytes);
  if (!img) { debug[idx].status = 'decode_failed'; return null; }
  debug[idx].status = 'used';
  return { img, productIndex: idx };
}

// Grid layout: returns [cx, cy, maxW, maxH] in pixels for each cell.
function layoutCells(n: number, W: number, H: number): Array<[number, number, number, number]> {
  const pad = 40;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  if (n === 1) {
    return [[W / 2, H / 2, innerW, innerH]];
  }
  if (n === 2) {
    const cw = innerW / 2;
    return [
      [pad + cw / 2, H / 2, cw - 20, innerH],
      [pad + cw + cw / 2, H / 2, cw - 20, innerH],
    ];
  }
  if (n === 3) {
    const topH = innerH * 0.55;
    const botH = innerH * 0.45;
    const botCw = innerW / 2;
    return [
      [W / 2, pad + topH / 2, innerW * 0.7, topH - 20],
      [pad + botCw / 2, pad + topH + botH / 2, botCw - 20, botH - 20],
      [pad + botCw + botCw / 2, pad + topH + botH / 2, botCw - 20, botH - 20],
    ];
  }
  if (n === 4) {
    const cw = innerW / 2;
    const ch = innerH / 2;
    return [
      [pad + cw / 2, pad + ch / 2, cw - 20, ch - 20],
      [pad + cw + cw / 2, pad + ch / 2, cw - 20, ch - 20],
      [pad + cw / 2, pad + ch + ch / 2, cw - 20, ch - 20],
      [pad + cw + cw / 2, pad + ch + ch / 2, cw - 20, ch - 20],
    ];
  }
  // 5+: hero on left, stack on right
  const heroW = innerW * 0.58;
  const stackW = innerW * 0.42;
  const stackN = n - 1;
  const stackH = innerH / stackN;
  const cells: Array<[number, number, number, number]> = [
    [pad + heroW / 2, H / 2, heroW - 20, innerH],
  ];
  for (let i = 0; i < stackN; i++) {
    cells.push([pad + heroW + stackW / 2, pad + stackH * i + stackH / 2, stackW - 20, stackH - 20]);
  }
  return cells;
}

async function buildCollage(products: ProductInfo[]): Promise<{ image: string; debug: CollageDebugItem[] }> {
  const CANVAS_W = 900;
  const CANVAS_H = 1200;
  const BG = 0xf0ece7ff; // warm naturals soft

  const canvas = new Image(CANVAS_W, CANVAS_H).fill(BG);

  const debug: CollageDebugItem[] = products.map((p) => ({
    name: p.name,
    category: p.category,
    status: 'skipped',
    considered: [],
    rejected: [],
  }));

  const decoded = (await Promise.all(
    products.map((p, idx) => decodeProduct(p, idx, debug))
  )).filter((c): c is Cutout => c !== null);

  if (decoded.length === 0) {
    const reason = debug.map((d) => `${d.name}: ${d.status}`).join('; ');
    throw new Error(`Could not prepare any product cutouts. ${reason}`);
  }

  const cells = layoutCells(decoded.length, CANVAS_W, CANVAS_H);

  decoded.forEach((item, i) => {
    const [cx, cy, maxW, maxH] = cells[i] ?? cells[cells.length - 1];
    const scale = Math.min(maxW / item.img.width, maxH / item.img.height);
    const targetW = Math.max(8, Math.round(item.img.width * scale));
    const targetH = Math.max(8, Math.round(item.img.height * scale));
    const placed = item.img.clone().resize(targetW, targetH);
    const dx = Math.round(cx - targetW / 2);
    const dy = Math.round(cy - targetH / 2);
    applyDropShadow(canvas, placed, dx + 6, dy + 10, 0.5);
    canvas.composite(placed, dx, dy);
  });

  const png = await canvas.encode(1);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < png.length; i += chunkSize) {
    binary += String.fromCharCode(...png.subarray(i, i + chunkSize));
  }
  return { image: `data:image/png;base64,${btoa(binary)}`, debug };
}

// ---------- HTTP handler ----------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products } = await req.json();
    if (!Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: 'No products provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productList = products as ProductInfo[];
    const withImages = productList.filter((p) => !!p.image || !!p.trusted_image);

    if (withImages.length === 0) {
      return new Response(JSON.stringify({ error: 'No product images to compose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode toggle: COLLAGE_MODE=cutout falls back to the legacy deterministic grid.
    // Default = "ai" (Atelier-style still life via Gemini image model).
    const mode = (Deno.env.get('COLLAGE_MODE') || 'ai').toLowerCase();

    if (mode === 'ai') {
      const { image, debug } = await runAiCollage(withImages.slice(0, 8));
      return new Response(
        JSON.stringify({
          image,
          items_used: withImages.length,
          items_skipped: 0,
          method: 'ai_still_life',
          debug,
          generated_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { image, debug } = await buildCollage(withImages.slice(0, 8));

    return new Response(
      JSON.stringify({
        image,
        items_used: debug.filter((d) => d.status === 'used').length,
        items_skipped: debug.filter((d) => d.status !== 'used').length,
        method: 'cutout_composition',
        debug,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error composing collage:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
