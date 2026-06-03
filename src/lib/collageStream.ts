import { createParser } from 'eventsource-parser';
import { flushSync } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchCollageMode } from './collageMode';

type ProductRef = {
  name: string;
  color: string | null;
  category: string | null;
  image: string;
  trusted_image: string;
};

export type CollageResult = {
  image: string;
  debug?: Array<Record<string, unknown>>;
};

export type CollageFrameHandler = (image: string, isFinal: boolean) => void;

/**
 * Invoke generate-look-collage. In `quality` mode, behaves like a normal
 * supabase.functions.invoke and resolves with the final image. In `quick`
 * mode, opens an SSE stream and emits partial frames via `onFrame` before
 * resolving with the final image.
 */
export async function invokeCollage(
  products: ProductRef[],
  onFrame?: CollageFrameHandler,
): Promise<CollageResult> {
  const mode = await fetchCollageMode();

  if (mode === 'quality') {
    const { data, error } = await supabase.functions.invoke('generate-look-collage', {
      body: { products, mode: 'quality' },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.image) throw new Error('No image returned');
    onFrame?.(data.image, true);
    return { image: data.image, debug: data.debug };
  }

  // Quick mode: stream SSE
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/generate-look-collage`;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || anonKey;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ products, mode: 'quick' }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Collage stream failed: ${res.status} ${text}`);
  }

  let finalImage: string | null = null;
  let finalDebug: Array<Record<string, unknown>> | undefined;

  const parser = createParser({
    onEvent(event) {
      if (event.event !== 'collage') return;
      let payload: { type: string; image?: string; debug?: Array<Record<string, unknown>>; error?: string };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.error) throw new Error(payload.error);
      if (payload.type === 'partial' && payload.image) {
        flushSync(() => onFrame?.(payload.image!, false));
      } else if (payload.type === 'final' && payload.image) {
        finalImage = payload.image;
        finalDebug = payload.debug;
        flushSync(() => onFrame?.(payload.image!, true));
      }
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!finalImage) throw new Error('Collage stream ended without a final image');
  return { image: finalImage, debug: finalDebug };
}
