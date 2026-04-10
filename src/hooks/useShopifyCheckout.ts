import { useState } from 'react';
import { useShopifyConfig } from '@/hooks/useShopifyConfig';
import { findShopifyProduct, createShopifyCheckout } from '@/utils/shopifyBuy';
import { toast } from 'sonner';

export const useShopifyCheckout = () => {
  const { isReady, domain, storefrontToken, embedCheckout } = useShopifyConfig();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const handleCheckout = async (shopifyHandle: string) => {
    if (!isReady || !shopifyHandle) return;
    setLoading(true);
    try {
      const product = await findShopifyProduct(domain, storefrontToken, shopifyHandle);
      if (!product || !product.variants || product.variants.length === 0) {
        toast.error('Product not found on store');
        return;
      }
      const variantId = product.variants[0].id;
      const url = await createShopifyCheckout(domain, storefrontToken, variantId);
      if (embedCheckout) {
        setCheckoutUrl(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (err: any) {
      toast.error('Failed to create checkout');
      console.error('Shopify checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeCheckout = () => setCheckoutUrl(null);

  return { isReady, handleCheckout, loading, checkoutUrl, closeCheckout, embedCheckout };
};
