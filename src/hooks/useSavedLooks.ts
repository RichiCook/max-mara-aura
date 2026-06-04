import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SavedLookInput {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  product_codes: string[];
}

export interface SavedLookRow {
  id: string;
  look_key: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  product_codes: string[];
  created_at: string;
}

export const buildLookKey = (productCodes: string[]) =>
  [...productCodes].map((c) => c.trim().toUpperCase()).sort().join('|');

export function useSavedLooks() {
  const { user, loading: authLoading } = useAuth();
  const [savedLooks, setSavedLooks] = useState<SavedLookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setSavedLooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('user_saved_looks')
      .select('id, look_key, name, description, image_url, product_codes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSavedLooks((data ?? []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refetch();
  }, [authLoading, refetch]);

  const keys = savedLooks.map((l) => l.look_key);
  const has = useCallback(
    (productCodes: string[]) => keys.includes(buildLookKey(productCodes)),
    [keys]
  );

  const save = useCallback(
    async (look: SavedLookInput) => {
      if (!user) return { error: new Error('Not signed in') };
      const look_key = buildLookKey(look.product_codes);
      // optimistic
      setSavedLooks((prev) =>
        prev.some((l) => l.look_key === look_key)
          ? prev
          : [
              {
                id: 'tmp-' + look_key,
                look_key,
                name: look.name ?? null,
                description: look.description ?? null,
                image_url: look.image_url ?? null,
                product_codes: look.product_codes,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]
      );
      const { error } = await supabase.from('user_saved_looks').insert({
        user_id: user.id,
        look_key,
        name: look.name ?? null,
        description: look.description ?? null,
        image_url: look.image_url ?? null,
        product_codes: look.product_codes,
      } as any);
      if (!error) refetch();
      return { error };
    },
    [user, refetch]
  );

  const remove = useCallback(
    async (productCodes: string[]) => {
      if (!user) return;
      const look_key = buildLookKey(productCodes);
      setSavedLooks((prev) => prev.filter((l) => l.look_key !== look_key));
      await supabase
        .from('user_saved_looks')
        .delete()
        .eq('user_id', user.id)
        .eq('look_key', look_key);
    },
    [user]
  );

  return { keys, savedLooks, has, save, remove, loading, refetch, requiresAuth: !user };
}
