import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LinkDestination = 'platform' | 'brand_website';

let cachedValue: LinkDestination | null = null;

export function useProductLinkDestination() {
  const [destination, setDestination] = useState<LinkDestination>(cachedValue || 'platform');

  useEffect(() => {
    if (cachedValue) return;
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'product_link_destination')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const val = (data.value as { destination?: string }).destination;
          if (val === 'brand_website' || val === 'platform') {
            cachedValue = val;
            setDestination(val);
          }
        }
      });
  }, []);

  const getProductUrl = (product: { slug: string; source_url?: string | null }) => {
    if (destination === 'brand_website' && product.source_url) {
      return product.source_url;
    }
    return `/product/${product.slug}`;
  };

  const isExternal = (product: { source_url?: string | null }) => {
    return destination === 'brand_website' && !!product.source_url;
  };

  return { destination, getProductUrl, isExternal };
}

export function invalidateProductLinkCache() {
  cachedValue = null;
}
