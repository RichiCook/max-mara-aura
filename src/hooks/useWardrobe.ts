import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useWardrobe() {
  const { user, loading: authLoading } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setProductIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('user_wardrobe')
      .select('product_id')
      .eq('user_id', user.id);
    setProductIds((data ?? []).map((r) => r.product_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refetch();
  }, [authLoading, refetch]);

  const has = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const add = useCallback(
    async (productId: string) => {
      if (!user) return { error: new Error('Not signed in') };
      setProductIds((p) => (p.includes(productId) ? p : [...p, productId]));
      const { error } = await supabase
        .from('user_wardrobe')
        .insert({ user_id: user.id, product_id: productId } as any);
      return { error };
    },
    [user]
  );

  const remove = useCallback(
    async (productId: string) => {
      if (!user) return;
      setProductIds((p) => p.filter((id) => id !== productId));
      await supabase
        .from('user_wardrobe')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    },
    [user]
  );

  return { productIds, has, add, remove, loading, refetch, requiresAuth: !user };
}
