import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInfo {
  name: string;
  color: string | null;
  category: string | null;
  image: string | null;
}

/**
 * Build a flat-lay collage from product packshots.
 * The model receives each product image as a reference and must:
 *  - cut every item out of its original background
 *  - arrange them into a single editorial flat-lay composition
 *  - place them on a soft warm-neutral backdrop
 *  - render no model, no mannequin, no text
 */
function buildCollagePrompt(products: ProductInfo[]): string {
  const items = products
    .map((p, i) => {
      const parts = [];
      if (p.name) parts.push(p.name);
      if (p.color) parts.push(`(${p.color})`);
      if (p.category) parts.push(`[${p.category}]`);
      return `- ITEM ${i + 1} (attached image ${i + 1}): ${parts.join(' ')}`;
    })
    .join('\n');

  return `EDITORIAL FLAT-LAY PRODUCT COLLAGE — NO MODEL, NO MANNEQUIN, NO TEXT.

Compose a single high-end fashion flat-lay where every garment and accessory from the attached product images is CUT OUT of its original background and arranged together in one harmonious composition.

ITEMS TO INCLUDE (each attached image is the EXACT source of truth for that item's color, shape, texture, and details — copy them faithfully):
${items}

LAYOUT RULES:
- Use the outer garment (coat / jacket / dress) as the visual anchor, placed slightly off-center.
- Knitwear, shirts, tops are layered or placed nearby, slightly overlapping where it feels natural.
- Pants, skirts cascade downward from the anchor.
- Shoes are placed at the bottom area as if they belong to the outfit underneath.
- Bags, hats, scarves, jewelry float around the composition with generous breathing room.
- Items should slightly overlap and cast SOFT, REALISTIC shadows on the backdrop — as if photographed from above on a styled surface.
- The composition should feel curated, asymmetric, editorial — NOT a grid, NOT a catalogue strip.

BACKDROP:
- Soft warm-neutral surface (warm beige / oatmeal / off-white, approximately #efeae3 to #f3ede5).
- Subtle paper or linen texture is welcome. NO patterns, NO props, NO furniture, NO branding.
- Even, diffused top-down studio light. Soft directional shadows only.

ABSOLUTE RULES:
- NO human body, NO model, NO mannequin, NO hands, NO face.
- NO text, NO logos overlaid, NO captions, NO watermarks, NO numbers, NO labels on the backdrop.
- Brand logos that already exist ON the garments stay as they are — do NOT add new ones.
- DO NOT invent extra items. Only the ${products.length} items listed above.
- DO NOT change garment colors, shapes, prints, or proportions from their reference images.
- Final image must look like an editorial flat-lay photograph shot from directly above.

Aspect ratio: tall portrait (3:4).`;
}

// Fetch a remote image and return a base64 data URL, bypassing hotlink protection
// by spoofing browser-like headers. Returns null if the fetch fails.
async function fetchImageAsDataUrl(rawUrl: string): Promise<string | null> {
  const candidates = rawUrl
    .split(/\r?\n/)
    .map((url) => url.split('#')[0].trim())
    .filter(Boolean);

  for (const cleanUrl of candidates) {
    try {
      if (cleanUrl.startsWith('data:')) return cleanUrl;

      const parsed = new URL(cleanUrl);
      const upstream = await fetch(parsed.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'referer': `${parsed.origin}/`,
        },
      });

      if (!upstream.ok) {
        console.warn(`Image fetch failed (${upstream.status}): ${cleanUrl}`);
        continue;
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const buf = new Uint8Array(await upstream.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < buf.length; i += chunkSize) {
        binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
      }
      return `data:${contentType};base64,${btoa(binary)}`;
    } catch (err) {
      console.warn(`Image fetch error for ${cleanUrl}:`, err);
    }
  }

  return null;
}

async function generateCollageWithLovableAI(
  prompt: string,
  productImages: string[],
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

  // Allow up to 6 product images for the collage.
  const limited = productImages.filter(Boolean).slice(0, 6);

  // Pre-fetch each image and inline as base64 data URL so the AI gateway never
  // has to fetch hotlink-protected CDNs itself.
  const inlined = await Promise.all(limited.map(fetchImageAsDataUrl));
  const usable = inlined.filter((u): u is string => !!u);

  if (usable.length === 0) {
    throw new Error('Could not fetch any product reference images');
  }

  const messageContent: any[] = [{ type: 'text', text: prompt }];
  for (const url of usable) {
    messageContent.push({ type: 'image_url', image_url: { url } });
  }

  console.log(`Collage: sending ${usable.length}/${limited.length} product images to Lovable AI (inlined)`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: messageContent }],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded');
    if (response.status === 402) throw new Error('Payment required');
    const errText = await response.text();
    console.error('AI gateway error:', response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    console.error('No image in collage response:', JSON.stringify(data).slice(0, 800));
    throw new Error('No collage image generated');
  }
  return imageUrl;
}

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
    const productImages = productList
      .map((p) => p.image)
      .filter((img): img is string => !!img);

    if (productImages.length === 0) {
      return new Response(JSON.stringify({ error: 'No product images to compose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildCollagePrompt(productList);
    const imageUrl = await generateCollageWithLovableAI(prompt, productImages);

    return new Response(
      JSON.stringify({
        image: imageUrl,
        items_used: productImages.length,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error generating collage:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = msg === 'Rate limit exceeded' ? 429 : msg === 'Payment required' ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
