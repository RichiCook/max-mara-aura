import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavedLookInput {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  product_codes: string[];
}

export const buildLookKey = (productCodes: string[]) =>
  [...productCodes].map((c) => c.trim().toUpperCase()).sort().join('|');

export function useSavedLooks() {
  const { user, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('user_saved_looks')
      .select('look_key')
      .eq('user_id', user.id);
    setKeys((data ?? []).map((r: any) => r.look_key));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refetch();
  }, [authLoading, refetch]);

  const has = useCallback((productCodes: string[]) => keys.includes(buildLookKey(productCodes)), [keys]);

  const save = useCallback(
    async (look: SavedLookInput) => {
      if (!user) return { error: new Error('Not signed in') };
      const look_key = buildLookKey(look.product_codes);
      setKeys((k) => (k.includes(look_key) ? k : [...k, look_key]));
      const { error } = await supabase.from('user_saved_looks').insert({
        user_id: user.id,
        look_key,
        name: look.name ?? null,
        description: look.description ?? null,
        image_url: look.image_url ?? null,
        product_codes: look.product_codes,
      } as any);
      return { error };
    },
    [user]
  );

  const remove = useCallback(
    async (productCodes: string[]) => {
      if (!user) return;
      const look_key = buildLookKey(productCodes);
      setKeys((k) => k.filter((x) => x !== look_key));
      await supabase
        .from('user_saved_looks')
        .delete()
        .eq('user_id', user.id)
        .eq('look_key', look_key);
    },
    [user]
  );

  return { keys, has, save, remove, loading, refetch, requiresAuth: !user };
}
