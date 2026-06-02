/**
 * Helpers to share a "look" (collage/photo + product links) to social channels.
 */

export interface ShareableProduct {
  name: string;
  product_code: string;
  short_code?: string | null;
  slug?: string | null;
}

export interface ShareableLook {
  name: string;
  description?: string | null;
  imageUrl: string | null;
  products: ShareableProduct[];
}

const origin = () =>
  (typeof window !== 'undefined' ? window.location.origin : '').replace(/\/$/, '');

export function buildLookShareUrl(look: ShareableLook): string {
  const params = new URLSearchParams();
  params.set('name', look.name);
  if (look.description) params.set('desc', look.description);
  if (look.imageUrl) params.set('img', look.imageUrl);
  const codes = look.products.map((p) => p.product_code).filter(Boolean).join(',');
  if (codes) params.set('codes', codes);
  return `${origin()}/look/share?${params.toString()}`;
}

export function buildProductUrl(p: ShareableProduct): string {
  if (p.short_code) return `${origin()}/p/${p.short_code}`;
  if (p.slug) return `${origin()}/product/${p.slug}`;
  return origin();
}

export function buildCaption(look: ShareableLook): string {
  const lines: string[] = [];
  lines.push(`${look.name} — shop the look:`);
  for (const p of look.products) {
    lines.push(`• ${p.name} → ${buildProductUrl(p)}`);
  }
  lines.push('');
  lines.push(`Full look: ${buildLookShareUrl(look)}`);
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

/** Web Share API with image attachment when supported. */
export async function nativeShare(look: ShareableLook): Promise<'shared' | 'unsupported' | 'cancelled'> {
  const caption = buildCaption(look);
  const url = buildLookShareUrl(look);
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported';

  // Try with image file if possible
  if (look.imageUrl && (navigator as any).canShare) {
    const file = await fetchLookImageAsFile(look.imageUrl, `${slugify(look.name)}.jpg`);
    if (file && (navigator as any).canShare({ files: [file] })) {
      try {
        await navigator.share({ title: look.name, text: caption, url, files: [file] } as any);
        return 'shared';
      } catch (e: any) {
        if (e?.name === 'AbortError') return 'cancelled';
      }
    }
  }
  try {
    await navigator.share({ title: look.name, text: caption, url });
    return 'shared';
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export async function shareToWhatsApp(look: ShareableLook) {
  const caption = buildCaption(look);
  // Send as a text message with the look URL so WhatsApp generates a clickable
  // link preview card (image from OG tags on /look/share). If we attached the
  // collage as a file, WhatsApp would deliver it as a plain photo — tapping it
  // would just open the image fullscreen instead of opening the look page.
  const text = encodeURIComponent(caption);
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
}

export function shareToSMS(look: ShareableLook) {
  const text = encodeURIComponent(buildCaption(look));
  // iOS uses &, Android uses ?; both forms generally accept "?&body=" or "?body="
  window.location.href = `sms:?&body=${text}`;
}

export function shareToMessenger(look: ShareableLook) {
  const url = encodeURIComponent(buildLookShareUrl(look));
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
}

export async function shareToInstagram(look: ShareableLook): Promise<{ status: 'ok' | 'no-image' }> {
  if (!look.imageUrl) return { status: 'no-image' };
  const file = await fetchLookImageAsFile(look.imageUrl, `${slugify(look.name)}.jpg`);
  if (file) downloadImage(file);
  await copyToClipboard(buildCaption(look));
  // Best-effort deep link (works on mobile with the IG app installed)
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
