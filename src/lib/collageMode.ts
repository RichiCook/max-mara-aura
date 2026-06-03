import { supabase } from '@/integrations/supabase/client';

export type CollageMode = 'quick' | 'quality';

const SETTING_ID = 'collage_generation_mode';
let cached: CollageMode | null = null;
let inflight: Promise<CollageMode> | null = null;
const listeners = new Set<(mode: CollageMode) => void>();

export async function fetchCollageMode(force = false): Promise<CollageMode> {
  if (!force && cached) return cached;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', SETTING_ID)
        .maybeSingle();
      const v = (data?.value as { mode?: string } | null)?.mode;
      cached = v === 'quick' ? 'quick' : 'quality';
    } catch {
      cached = 'quality';
    } finally {
      inflight = null;
    }
    return cached!;
  })();
  return inflight;
}

export async function setCollageMode(mode: CollageMode): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: SETTING_ID,
      value: { mode } as any,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
  cached = mode;
  listeners.forEach((l) => l(mode));
}

export function subscribeCollageMode(fn: (mode: CollageMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
