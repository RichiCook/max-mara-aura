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

function applyDropShadow(canvas: Image, cutout: Image, dx: number, dy: number, opacity: number) {
  // Build a soft, dark silhouette from the cutout's alpha channel.
  // imagescript has no built-in gaussian blur, so we approximate softness by
  // stamping the shadow at several sub-offsets with reduced opacity.
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

interface Cutout { slot: string; img: Image; productIndex: number }

interface CollageDebugItem {
  name: string;
  category: string | null;
  status: 'used' | 'no_valid_packshot' | 'fetch_failed' | 'decode_failed' | 'skipped';
  used_url?: string;
  considered: string[];
  rejected: string[];
}

async function buildCollage(products: ProductInfo[]): Promise<{ image: string; debug: CollageDebugItem[] }> {
  const CANVAS_W = 900;
  const CANVAS_H = 1200;
  const BG = 0xefeae3ff; // warm neutral

  // Background
  const canvas = new Image(CANVAS_W, CANVAS_H).fill(BG);

  // Decode all products in parallel
  const decoded: Cutout[] = [];
  const debug: CollageDebugItem[] = products.map((p) => ({
    name: p.name,
    category: p.category,
    status: 'skipped',
    considered: [],
    rejected: [],
  }));

  await Promise.all(products.map(async (p, idx) => {
    if (!p.image && !p.trusted_image) {
      debug[idx].status = 'skipped';
      return;
    }
    // If admin approved a trusted image, try it first without strict validation.
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
          debug[idx].used_url = p.trusted_image;
          debug[idx].considered = [p.trusted_image];
          try {
            const decodedImg = await decode(bytes);
            if (decodedImg instanceof Image) {
              let img = decodedImg as Image;
              const maxSide = Math.max(img.width, img.height);
              if (maxSide > 900) {
                const scale = 900 / maxSide;
                img = img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
              }
              img = removeBackground(img);
              img = trimTransparent(img);
              if (img.width >= 8 && img.height >= 8) {
                decoded.push({ slot: classifySlot(p.category, p.name), img, productIndex: idx });
                debug[idx].status = 'used';
                return;
              }
            }
          } catch (err) {
            console.warn(`Decode failed for trusted image "${p.name}":`, err);
          }
        }
      } catch (err) {
        console.warn(`Trusted image fetch failed for "${p.name}":`, err);
      }
      // Fall through to strict validation if trusted fetch/decode failed
    }
    if (!p.image) {
      debug[idx].status = 'no_valid_packshot';
      return;
    }
    const { bytes, usedUrl, selection } = await fetchImageBytes(p.image, p.category);
    debug[idx].considered = selection.considered;
    debug[idx].rejected = selection.rejected;
    if (!selection.url) {
      debug[idx].status = 'no_valid_packshot';
      console.warn(`No allowed packshot for "${p.name}" (${p.category}). Considered:`, selection.considered);
      return;
    }
    if (!bytes) {
      debug[idx].status = 'fetch_failed';
      console.warn(`Packshot selected but unfetchable for "${p.name}":`, selection.url);
      return;
    }
    debug[idx].used_url = usedUrl ?? selection.url;

    try {
      const decodedImg = await decode(bytes);
      if (!(decodedImg instanceof Image)) {
        debug[idx].status = 'decode_failed';
        return;
      }
      let img = decodedImg as Image;
      const maxSide = Math.max(img.width, img.height);
      if (maxSide > 900) {
        const scale = 900 / maxSide;
        img = img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
      }
      img = removeBackground(img);
      img = trimTransparent(img);
      if (img.width < 8 || img.height < 8) {
        debug[idx].status = 'decode_failed';
        return;
      }
      decoded.push({ slot: classifySlot(p.category, p.name), img, productIndex: idx });
      debug[idx].status = 'used';
    } catch (err) {
      debug[idx].status = 'decode_failed';
      console.warn(`Decode failed for "${p.name}":`, err);
    }
  }));

  if (decoded.length === 0) {
    const reason = debug.map((d) => `${d.name}: ${d.status}`).join('; ');
    throw new Error(`Could not prepare any product cutouts. ${reason}`);
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
      applyDropShadow(canvas, placed, dx + 6, dy + 10, 0.6);
      canvas.composite(placed, dx, dy);
    });
  }

  const png = await canvas.encode(1); // PNG, fastest compression
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
    const withImages = productList.filter((p) => !!p.image);
    if (withImages.length === 0) {
      return new Response(JSON.stringify({ error: 'No product images to compose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
