import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LS_KEY = 'wishlist:guest:v1';

const readGuest = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeGuest = (ids: string[]) => {
  localStorage.setItem(LS_KEY, JSON.stringify(Array.from(new Set(ids))));
};

export function useWishlist() {
  const { user, loading: authLoading } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const mergedRef = useRef(false);

  const fetchServer = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_wishlist')
      .select('product_id')
      .eq('user_id', uid);
    setProductIds((data ?? []).map((r) => r.product_id));
  }, []);

  // Initial load + merge guest list on sign-in
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      setLoading(true);
      if (user) {
        if (!mergedRef.current) {
          const guest = readGuest();
          if (guest.length > 0) {
            const rows = guest.map((product_id) => ({ user_id: user.id, product_id }));
            await supabase.from('user_wishlist').insert(rows as any);
            localStorage.removeItem(LS_KEY);
          }
          mergedRef.current = true;
        }
        await fetchServer(user.id);
      } else {
        mergedRef.current = false;
        setProductIds(readGuest());
      }
      setLoading(false);
    })();
  }, [user, authLoading, fetchServer]);

  const has = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const toggle = useCallback(
    async (productId: string) => {
      const isOn = productIds.includes(productId);
      if (user) {
        if (isOn) {
          setProductIds((p) => p.filter((id) => id !== productId));
          await supabase
            .from('user_wishlist')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId);
        } else {
          setProductIds((p) => [...p, productId]);
          await supabase
            .from('user_wishlist')
            .insert({ user_id: user.id, product_id: productId } as any);
        }
      } else {
        const next = isOn ? productIds.filter((id) => id !== productId) : [...productIds, productId];
        setProductIds(next);
        writeGuest(next);
      }
      return !isOn;
    },
    [productIds, user]
  );

  return { productIds, has, toggle, loading, isGuest: !user };
}
