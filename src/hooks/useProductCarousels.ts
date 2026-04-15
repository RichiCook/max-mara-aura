import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { Product } from '@/hooks/useProducts';

export interface CarouselDefinition {
  id: string;
  name: string;
  match_type: string;
  match_config: {
    fallback_to_collection?: boolean;
    max_items?: number;
    match_fields?: string[];
  };
  layout: {
    card_size: 'small' | 'medium' | 'large';
    columns: number;
  };
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarouselWithProducts extends CarouselDefinition {
  products: Product[];
}

/** Admin CRUD hook for carousel definitions */
export const useCarouselDefinitions = () => {
  const [carousels, setCarousels] = useState<CarouselDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCarousels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_carousels')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching carousels:', error);
    } else {
      setCarousels((data || []).map(c => ({
        ...c,
        match_config: (c.match_config || {}) as CarouselDefinition['match_config'],
        layout: (c.layout || { card_size: 'small', columns: 4 }) as CarouselDefinition['layout'],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCarousels(); }, [fetchCarousels]);

  const createCarousel = async (carousel: Partial<CarouselDefinition>) => {
    const { error } = await supabase
      .from('product_carousels')
      .insert({
        name: carousel.name || 'New Carousel',
        match_type: carousel.match_type || 'category',
        match_config: carousel.match_config || {},
        layout: carousel.layout || { card_size: 'small', columns: 4 },
        display_order: carousel.display_order ?? carousels.length,
        is_active: carousel.is_active ?? true,
      } as any);
    if (error) return { success: false, error: error.message };
    await fetchCarousels();
    return { success: true };
  };

  const updateCarousel = async (id: string, updates: Partial<CarouselDefinition>) => {
    const { error } = await supabase
      .from('product_carousels')
      .update(updates as any)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    await fetchCarousels();
    return { success: true };
  };

  const deleteCarousel = async (id: string) => {
    const { error } = await supabase
      .from('product_carousels')
      .delete()
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    await fetchCarousels();
    return { success: true };
  };

  return { carousels, loading, refetch: fetchCarousels, createCarousel, updateCarousel, deleteCarousel };
};

/** Resolve products for all active carousels on a product page */
export const useProductCarousels = (product: Product | null) => {
  const [carouselsWithProducts, setCarouselsWithProducts] = useState<CarouselWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) { setLoading(false); return; }

    const resolve = async () => {
      setLoading(true);

      // Fetch active carousels
      const { data: carousels } = await supabase
        .from('product_carousels')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!carousels || carousels.length === 0) {
        setCarouselsWithProducts([]);
        setLoading(false);
        return;
      }

      // Fetch manual items for this product (source_product_id = product.id OR null for global)
      const { data: manualItems } = await supabase
        .from('product_carousel_items')
        .select('*')
        .or(`source_product_id.eq.${product.id},source_product_id.is.null`)
        .order('display_order', { ascending: true });

      const results: CarouselWithProducts[] = [];

      for (const carousel of carousels) {
        const config = (carousel.match_config || {}) as CarouselDefinition['match_config'];
        const layout = (carousel.layout || { card_size: 'small', columns: 4 }) as CarouselDefinition['layout'];
        const maxItems = config.max_items || 12;
        let products: Product[] = [];

        // Check for manual items for this carousel
        const carouselManualItems = (manualItems || []).filter(i => i.carousel_id === carousel.id);

        if (carousel.match_type === 'manual') {
          // Only manual picks
          if (carouselManualItems.length > 0) {
            const targetIds = carouselManualItems.map(i => i.target_product_id);
            const { data } = await supabase
              .from('products')
              .select('*')
              .in('id', targetIds)
              .neq('id', product.id)
              .limit(maxItems);
            if (data) {
              products = data.map(p => ({
                ...p,
                images: normalizeImages(p.images),
                wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
                you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
              }));
              // Preserve manual order
              const orderMap = new Map(carouselManualItems.map((item, idx) => [item.target_product_id, idx]));
              products.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
            }
          }
        } else {
          // Rule-based matching
          products = await resolveRuleBasedProducts(product, carousel.match_type, config, maxItems);

          // Merge in manual items (prepended)
          if (carouselManualItems.length > 0) {
            const targetIds = carouselManualItems.map(i => i.target_product_id);
            const { data: manualProducts } = await supabase
              .from('products')
              .select('*')
              .in('id', targetIds)
              .neq('id', product.id);
            if (manualProducts) {
              const manual = manualProducts.map(p => ({
                ...p,
                images: normalizeImages(p.images),
                wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
                you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
              }));
              const manualIds = new Set(manual.map(p => p.id));
              products = [...manual, ...products.filter(p => !manualIds.has(p.id))].slice(0, maxItems);
            }
          }
        }

        if (products.length > 0) {
          results.push({
            ...carousel,
            match_config: config,
            layout,
            products,
          });
        }
      }

      setCarouselsWithProducts(results);
      setLoading(false);
    };

    resolve();
  }, [product?.id, product?.category, product?.collection, (product as any)?.color]);

  return { carouselsWithProducts, loading };
};

async function resolveRuleBasedProducts(
  product: Product,
  matchType: string,
  config: CarouselDefinition['match_config'],
  maxItems: number
): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .neq('id', product.id)
    .limit(maxItems);

  if (matchType === 'category' && product.category) {
    query = query.eq('category', product.category);
  } else if (matchType === 'collection' && (product as any).collection) {
    query = query.eq('collection', (product as any).collection);
  } else if (matchType === 'color' && (product as any).color) {
    query = query.eq('color', (product as any).color);
  } else {
    return [];
  }

  const { data } = await query;
  let products = (data || []).map(p => ({
    ...p,
    images: normalizeImages(p.images),
    wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
    you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
  }));

  // Fallback to collection if category returned nothing
  if (products.length === 0 && matchType === 'category' && config.fallback_to_collection && (product as any).collection) {
    const { data: fallback } = await supabase
      .from('products')
      .select('*')
      .neq('id', product.id)
      .eq('collection', (product as any).collection)
      .limit(maxItems);
    if (fallback) {
      products = fallback.map(p => ({
        ...p,
        images: normalizeImages(p.images),
        wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
        you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
      }));
    }
  }

  return products;
}
