import Client from 'shopify-buy';

let clientInstance: ReturnType<typeof Client.buildClient> | null = null;

export const getShopifyClient = (domain: string, storefrontToken: string) => {
  if (clientInstance) return clientInstance;
  clientInstance = Client.buildClient({
    domain,
    storefrontAccessToken: storefrontToken,
    apiVersion: '2024-01',
  });
  return clientInstance;
};

export const createShopifyCheckout = async (
  domain: string,
  storefrontToken: string,
  variantId: string,
  quantity = 1
): Promise<string> => {
  const client = getShopifyClient(domain, storefrontToken);
  const checkout = await (client as any).checkout.create();
  const lineItems = [{ variantId, quantity }];
  const updated = await (client as any).checkout.addLineItems(checkout.id, lineItems);
  return updated.webUrl;
};

export const findShopifyProduct = async (
  domain: string,
  storefrontToken: string,
  handle: string
) => {
  const client = getShopifyClient(domain, storefrontToken);
  const product = await (client as any).product.fetchByHandle(handle);
  return product;
};

export const resetShopifyClient = () => {
  clientInstance = null;
};
