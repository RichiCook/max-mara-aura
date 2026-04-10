import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShopifyConfig {
  enabled: boolean;
  domain: string;
  storefrontToken: string;
  embedCheckout: boolean;
}

export const useShopifyConfig = () => {
  const [config, setConfig] = useState<ShopifyConfig>({ enabled: false, domain: '', storefrontToken: '', embedCheckout: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'shopify_config')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as any;
          setConfig({
            enabled: val.enabled ?? false,
            domain: val.domain ?? '',
            storefrontToken: val.storefrontToken ?? '',
            embedCheckout: val.embedCheckout ?? true,
          });
        }
        setLoading(false);
      });
  }, []);

  return { ...config, loading, isReady: config.enabled && !!config.domain && !!config.storefrontToken };
};
