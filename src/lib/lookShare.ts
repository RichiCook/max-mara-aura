/**
 * Helpers to share a "look" (collage/photo + product links) to social channels.
 */
import { supabase } from '@/integrations/supabase/client';


export interface ShareableProduct {
  name: string;
  product_code: string;
  short_code?: string | null;
  slug?: string | null;
  source_url?: string | null;
}

export interface ShareableLook {
  name: string;
  description?: string | null;
  imageUrl: string | null;
  products: ShareableProduct[];
}

const origin = () =>
  (typeof window !== 'undefined' ? window.location.origin : '').replace(/\/$/, '');

/** The SPA route — used inside the app for direct navigation. */
export function buildLookSpaUrl(look: ShareableLook): string {
  const params = new URLSearchParams();
  params.set('name', look.name);
  if (look.description) params.set('desc', look.description);
  if (look.imageUrl) params.set('img', look.imageUrl);
  const codes = look.products.map((p) => p.product_code).filter(Boolean).join(',');
  if (codes) params.set('codes', codes);
  return `${origin()}/look/share?${params.toString()}`;
}

/**
 * Shareable URL that goes through a server-rendered OG edge function.
 * Social crawlers (WhatsApp, iMessage, Slack, FB) don't run JS, so the
 * og:image set client-side in LookSharePage is invisible to them.
 * The edge function returns OG-tagged HTML for crawlers and 302-redirects
 * real users to the SPA route.
 */
export function buildLookShareUrl(look: ShareableLook): string {
  const params = new URLSearchParams();
  params.set('name', look.name);
  if (look.description) params.set('desc', look.description);
  if (look.imageUrl) params.set('img', look.imageUrl);
  const codes = look.products.map((p) => p.product_code).filter(Boolean).join(',');
  if (codes) params.set('codes', codes);
  params.set('app', origin());
  return `https://vifbscpxguafvhccybhq.supabase.co/functions/v1/look-share-og?${params.toString()}`;
}

/**
 * Persist this look as a row in `look_shares` and return a short URL
 * (e.g. https://maxmara.aitems.dev/l/aB3xY9) that resolves to the look page.
 * Falls back to the long /look/share URL if the insert fails.
 */
export async function createLookShortUrl(look: ShareableLook): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('look_shares')
      .insert({
        name: look.name,
        description: look.description ?? null,
        image_url: look.imageUrl ?? null,
        product_codes: look.products.map((p) => p.product_code).filter(Boolean),
      })
      .select('short_code')
      .single();
    if (error || !data?.short_code) throw error;
    return `${origin()}/l/${data.short_code}`;
  } catch (e) {
    console.warn('createLookShortUrl failed, falling back to long URL', e);
    return buildLookSpaUrl(look);
  }
}

export function buildProductUrl(p: ShareableProduct): string {
  // Prefer the external e-commerce URL so recipients land on the purchase page.
  if (p.source_url) return p.source_url;
  if (p.short_code) return `${origin()}/p/${p.short_code}`;
  if (p.slug) return `${origin()}/product/${p.slug}`;
  return origin();
}

/** Short Italian caption used when the picture is sent alongside the link. */
export function buildShortCaption(shortUrl: string, look?: ShareableLook): string {
  const lines: string[] = [`Scopri il look:`, shortUrl];
  if (look && look.products.length) {
    lines.push('');
    lines.push('Acquista i singoli pezzi:');
    for (const p of look.products) {
      lines.push(`• ${p.name} → ${buildProductUrl(p)}`);
    }
  }
  return lines.join('\n');
}

export function buildCaption(look: ShareableLook): string {
  // Long-form fallback caption (used by copy-to-clipboard).
  const lines: string[] = [];
  lines.push(look.name);
  lines.push('');
  lines.push('Acquista i singoli pezzi:');
  for (const p of look.products) {
    lines.push(`• ${p.name} → ${buildProductUrl(p)}`);
  }
  return lines.join('\n');
}

/** Fetch image via the CORS-bypass edge function and return a Blob/File. */
export async function fetchLookImageAsFile(imageUrl: string, filename = 'look.jpg'): Promise<File | null> {
  try {
    // Try a direct fetch first (works for our Supabase-hosted collages)
    let resp = await fetch(imageUrl, { mode: 'cors' });
    if (!resp.ok) throw new Error('direct fetch failed');
    const blob = await resp.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  } catch {
    try {
      const proxied = `https://vifbscpxguafvhccybhq.supabase.co/functions/v1/export-image-proxy?url=${encodeURIComponent(imageUrl)}`;
      const resp = await fetch(proxied);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    } catch {
      return null;
    }
  }
}

export function downloadImage(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Web Share API with image attachment + short Italian caption. */
export async function nativeShare(look: ShareableLook): Promise<'shared' | 'unsupported' | 'cancelled'> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported';
  const shortUrl = await createLookShortUrl(look);
  const caption = buildShortCaption(shortUrl);

  // Try with image file if possible — picture + "Scopri il look: <short url>"
  if (look.imageUrl && (navigator as any).canShare) {
    const file = await fetchLookImageAsFile(look.imageUrl, `${slugify(look.name)}.jpg`);
    if (file && (navigator as any).canShare({ files: [file] })) {
      try {
        await navigator.share({ title: look.name, text: caption, files: [file] } as any);
        return 'shared';
      } catch (e: any) {
        if (e?.name === 'AbortError') return 'cancelled';
      }
    }
  }
  try {
    await navigator.share({ title: look.name, text: caption, url: shortUrl });
    return 'shared';
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export async function shareToWhatsApp(look: ShareableLook) {
  const shortUrl = await createLookShortUrl(look);
  const caption = buildShortCaption(shortUrl);

  // Prefer native share so the collage image is attached as a photo and the
  // caption ("Scopri il look: <short url>") sits right below it in WhatsApp.
  if (typeof navigator !== 'undefined' && (navigator as any).canShare && look.imageUrl) {
    const file = await fetchLookImageAsFile(look.imageUrl, `${slugify(look.name)}.jpg`);
    if (file && (navigator as any).canShare({ files: [file] })) {
      try {
        await navigator.share({ title: look.name, text: caption, files: [file] } as any);
        return;
      } catch {
        /* fall through to wa.me */
      }
    }
  }

  // Fallback: text-only via wa.me (no image attachment available).
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank', 'noopener,noreferrer');
}

export async function shareToSMS(look: ShareableLook) {
  const shortUrl = await createLookShortUrl(look);
  const text = encodeURIComponent(buildShortCaption(shortUrl));
  window.location.href = `sms:?&body=${text}`;
}

export async function shareToMessenger(look: ShareableLook) {
  const shortUrl = await createLookShortUrl(look);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`, '_blank', 'noopener,noreferrer');
}

export async function shareToInstagram(look: ShareableLook): Promise<{ status: 'ok' | 'no-image' }> {
  if (!look.imageUrl) return { status: 'no-image' };
  const file = await fetchLookImageAsFile(look.imageUrl, `${slugify(look.name)}.jpg`);
  if (file) downloadImage(file);
  const shortUrl = await createLookShortUrl(look);
  await copyToClipboard(buildShortCaption(shortUrl));
  setTimeout(() => {
    window.location.href = 'instagram://story-camera';
  }, 400);
  return { status: 'ok' };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'look';
}
