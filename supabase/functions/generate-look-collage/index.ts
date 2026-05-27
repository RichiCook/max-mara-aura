import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

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

// ---------- Image fetching ----------

async function fetchImageBytes(rawUrl: string): Promise<Uint8Array | null> {
  const candidates = rawUrl
    .split(/\r?\n/)
    .map((url) => url.split('#')[0].trim())
    .filter(Boolean);

  for (const cleanUrl of candidates) {
    try {
      if (cleanUrl.startsWith('data:')) {
        const [, b64] = cleanUrl.split(',');
        if (!b64) continue;
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
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
        console.warn(`Image fetch failed (${upstream.status}): ${cleanUrl}`);
        continue;
      }
      return new Uint8Array(await upstream.arrayBuffer());
    } catch (err) {
      console.warn(`Image fetch error for ${cleanUrl}:`, err);
    }
  }
  return null;
}

// ---------- Background removal (deterministic, no AI) ----------

// Treat near-white pixels as background. Most Max Mara / Casadei packshots
// sit on a #ffffff / very-light-grey backdrop, so a simple luminance +
// saturation threshold gives a clean cutout. We also flood-fill from the
// outer border so any background pixel that touches an edge is removed,
// while interior light/white areas of the garment itself are kept.
function removeBackground(img: Image): Image {
  const w = img.width;
  const h = img.height;
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  const isBgPixel = (r: number, g: number, b: number) => {
    // Bright + low chroma => background
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    return max >= 235 && chroma <= 18;
  };

  const pushIfBg = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const pixel = img.getPixelAt(x + 1, y + 1); // imagescript is 1-indexed
    const r = (pixel >> 24) & 0xff;
    const g = (pixel >> 16) & 0xff;
    const b = (pixel >> 8) & 0xff;
    if (isBgPixel(r, g, b)) {
      visited[idx] = 1;
      stack.push(x, y);
    }
  };

  // Seed flood-fill from every border pixel
  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    img.setPixelAt(x + 1, y + 1, 0x00000000);
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
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

// ---------- Category-aware placement ----------

const CATEGORY_PATTERNS: Array<{ slot: string; keywords: string[] }> = [
  { slot: 'outerwear', keywords: ['coat', 'cappott', 'cappa', 'cape', 'trench', 'piumino', 'puffer', 'parka'] },
  { slot: 'jacket', keywords: ['jacket', 'giacca', 'blazer', 'bomber'] },
  { slot: 'dress', keywords: ['dress', 'abito', 'vestito', 'gown', 'jumpsuit', 'tuta'] },
  { slot: 'top', keywords: ['shirt', 'camicia', 'blusa', 'blouse', 'top', 'maglia', 'maglion', 'sweater', 'knit', 'cardigan', 't-shirt', 'tshirt', 'felpa', 'pullover'] },
  { slot: 'bottom', keywords: ['pant', 'pantalon', 'jeans', 'trouser', 'short', 'skirt', 'gonna', 'denim'] },
  { slot: 'shoes', keywords: ['shoe', 'scarpa', 'sneaker', 'boot', 'stival', 'sandal', 'pump', 'décollet', 'decollet', 'mocassin', 'loafer', 'ciabatt', 'slide', 'heel'] },
  { slot: 'bag', keywords: ['bag', 'borsa', 'pochette', 'clutch', 'tote', 'shopper', 'handbag', 'wallet', 'portafogli'] },
  { slot: 'accessory', keywords: ['belt', 'cintura', 'scarf', 'sciarpa', 'foulard', 'hat', 'cappello', 'glove', 'guant', 'glasses', 'occhial', 'jewel', 'bijou', 'collana', 'orecchin', 'bracciale', 'anell'] },
];

function classifySlot(category: string | null, name: string | null): string {
  const text = `${category || ''} ${name || ''}`.toLowerCase();
  for (const { slot, keywords } of CATEGORY_PATTERNS) {
    if (keywords.some((k) => text.includes(k))) return slot;
  }
  return 'top';
}

// Canvas geometry (3:4 portrait). Positions are relative (0..1) on the canvas.
// Each slot describes its center point and the max width/height (also relative)
// the cutout may occupy. Multiple items in the same slot fan out horizontally.
interface SlotBox { cx: number; cy: number; maxW: number; maxH: number }

const SLOT_LAYOUT: Record<string, SlotBox> = {
  outerwear: { cx: 0.50, cy: 0.42, maxW: 0.62, maxH: 0.62 },
  dress:     { cx: 0.50, cy: 0.45, maxW: 0.52, maxH: 0.65 },
  jacket:    { cx: 0.50, cy: 0.40, maxW: 0.52, maxH: 0.50 },
  top:       { cx: 0.30, cy: 0.30, maxW: 0.40, maxH: 0.36 },
  bottom:    { cx: 0.70, cy: 0.55, maxW: 0.42, maxH: 0.48 },
  shoes:     { cx: 0.35, cy: 0.82, maxW: 0.36, maxH: 0.20 },
  bag:       { cx: 0.78, cy: 0.78, maxW: 0.30, maxH: 0.28 },
  accessory: { cx: 0.20, cy: 0.78, maxW: 0.24, maxH: 0.20 },
};

const SLOT_PRIORITY = ['outerwear', 'dress', 'jacket', 'top', 'bottom', 'shoes', 'bag', 'accessory'];

// ---------- Drop shadow ----------

function applyDropShadow(canvas: Image, cutout: Image, dx: number, dy: number, blurPx: number, opacity: number) {
  // Build a soft, dark silhouette from the cutout's alpha channel.
  const w = cutout.width;
  const h = cutout.height;
  const shadow = new Image(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = cutout.getPixelAt(x + 1, y + 1) & 0xff;
      if (a > 0) {
        const newA = Math.round((a / 255) * opacity * 255);
        shadow.setPixelAt(x + 1, y + 1, (0x14 << 24) | (0x14 << 16) | (0x14 << 8) | newA);
      }
    }
  }
  if (blurPx > 0) shadow.blur(blurPx);
  canvas.composite(shadow, dx, dy);
}

// ---------- Main compositor ----------

interface Cutout { slot: string; img: Image; productIndex: number }

async function buildCollage(products: ProductInfo[]): Promise<string> {
  const CANVAS_W = 900;
  const CANVAS_H = 1200;
  const BG = 0xefeae3ff; // warm neutral

  // Background
  const canvas = new Image(CANVAS_W, CANVAS_H).fill(BG);

  // Decode all products in parallel
  const decoded: Cutout[] = [];
  await Promise.all(products.map(async (p, idx) => {
    if (!p.image) return;
    const bytes = await fetchImageBytes(p.image);
    if (!bytes) return;
    try {
      const decodedImg = await decode(bytes);
      if (!(decodedImg instanceof Image)) return;
      let img = decodedImg as Image;
      // Downscale very large source images to keep processing snappy
      const maxSide = Math.max(img.width, img.height);
      if (maxSide > 900) {
        const scale = 900 / maxSide;
        img = img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
      }
      img = removeBackground(img);
      img = trimTransparent(img);
      if (img.width < 8 || img.height < 8) return;
      decoded.push({ slot: classifySlot(p.category, p.name), img, productIndex: idx });
    } catch (err) {
      console.warn(`Decode failed for product ${idx}:`, err);
    }
  }));

  if (decoded.length === 0) {
    throw new Error('Could not prepare any product cutouts from the provided images');
  }

  // Group by slot and order by priority
  const bySlot = new Map<string, Cutout[]>();
  for (const c of decoded) {
    if (!bySlot.has(c.slot)) bySlot.set(c.slot, []);
    bySlot.get(c.slot)!.push(c);
  }

  // If we have neither outerwear/dress nor jacket, promote the largest top as anchor
  const hasAnchor = bySlot.has('outerwear') || bySlot.has('dress') || bySlot.has('jacket');
  if (!hasAnchor && bySlot.has('top')) {
    const tops = bySlot.get('top')!;
    tops.sort((a, b) => (b.img.width * b.img.height) - (a.img.width * a.img.height));
    const promoted = tops.shift()!;
    promoted.slot = 'dress';
    if (tops.length === 0) bySlot.delete('top');
    bySlot.set('dress', [promoted]);
  }

  // Place items per slot
  for (const slot of SLOT_PRIORITY) {
    const items = bySlot.get(slot);
    if (!items || items.length === 0) continue;
    const box = SLOT_LAYOUT[slot];

    const boxW = box.maxW * CANVAS_W;
    const boxH = box.maxH * CANVAS_H;
    const cx = box.cx * CANVAS_W;
    const cy = box.cy * CANVAS_H;

    items.forEach((item, i) => {
      // Fan multiple items horizontally within the slot
      const fan = items.length === 1 ? 0 : (i - (items.length - 1) / 2);
      const fanOffset = fan * boxW * 0.45;

      // Fit cutout into the slot box while preserving aspect ratio
      const scale = Math.min(boxW / item.img.width, boxH / item.img.height);
      const targetW = Math.max(8, Math.round(item.img.width * scale));
      const targetH = Math.max(8, Math.round(item.img.height * scale));
      const placed = item.img.clone().resize(targetW, targetH);

      const dx = Math.round(cx + fanOffset - targetW / 2);
      const dy = Math.round(cy - targetH / 2);

      // Soft drop shadow then the cutout
      applyDropShadow(canvas, placed, dx + 6, dy + 10, 8, 0.35);
      canvas.composite(placed, dx, dy);
    });
  }

  const png = await canvas.encode(1); // PNG, fastest compression
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < png.length; i += chunkSize) {
    binary += String.fromCharCode(...png.subarray(i, i + chunkSize));
  }
  return `data:image/png;base64,${btoa(binary)}`;
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
    const withImages = productList.filter((p) => !!p.image);
    if (withImages.length === 0) {
      return new Response(JSON.stringify({ error: 'No product images to compose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const image = await buildCollage(withImages.slice(0, 8));

    return new Response(
      JSON.stringify({
        image,
        items_used: withImages.length,
        method: 'cutout_composition',
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
