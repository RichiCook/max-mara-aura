import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { Product } from '@/hooks/useProducts';

export interface CarouselDefinition {
  id: string;
  name: string;
  match_type: string;
  match_config: Record<string, any>;
  layout: {
    card_size: 'small' | 'medium' | 'large';
    columns: number;
  };
  display_order: number;
  is_active: boolean;
  display_position: string;
  show_on_categories: string[];
  min_products: number;
  sort_by: string;
  exclude_current: boolean;
  target_category: string;
  target_attribute_overrides: Record<string, any>;
  fallback_behavior: string;
  created_at: string;
  updated_at: string;
}

export interface CarouselWithProducts extends CarouselDefinition {
  products: Product[];
  match_reason?: string;
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
        match_config: (c.match_config || {}) as Record<string, any>,
        layout: (c.layout || { card_size: 'small', columns: 4 }) as CarouselDefinition['layout'],
        show_on_categories: (c as any).show_on_categories || ['all'],
        display_position: (c as any).display_position || 'below_product_info',
        min_products: (c as any).min_products ?? 3,
        sort_by: (c as any).sort_by || 'newest',
        exclude_current: (c as any).exclude_current !== false,
        target_category: c.target_category || 'same',
        target_attribute_overrides: (c.target_attribute_overrides || {}) as Record<string, any>,
        fallback_behavior: c.fallback_behavior || 'use_match_type',
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
        display_position: carousel.display_position || 'below_product_info',
        show_on_categories: carousel.show_on_categories || ['all'],
        min_products: carousel.min_products ?? 3,
        sort_by: carousel.sort_by || 'newest',
        exclude_current: carousel.exclude_current !== false,
        fallback_behavior: (carousel as any).fallback_behavior || 'use_match_type',
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

  const installEssentials = async () => {
    const essentials = [
      { name: 'Similar Products', match_type: 'category', match_config: { fallback_to_collection: true, max_items: 12 }, display_order: 0 },
      { name: 'Complete the Look', match_type: 'complete_look', match_config: { max_items: 8 }, display_order: 1 },
      { name: 'You May Also Like', match_type: 'ai_recommend', match_config: { max_items: 12, weights: { category: 30, color: 20, price: 20, style: 15, popularity: 15 } }, display_order: 2 },
      { name: 'Recently Viewed', match_type: 'recently_viewed', match_config: { max_items: 10, time_window: '7_days' }, display_order: 3 },
    ];
    for (const e of essentials) {
      await createCarousel({ ...e, layout: { card_size: 'small', columns: 4 } });
    }
  };

  return { carousels, loading, refetch: fetchCarousels, createCarousel, updateCarousel, deleteCarousel, installEssentials };
};

/** Resolve products for all active carousels on a product page via edge function */
export const useProductCarousels = (product: Product | null) => {
  const [carouselsWithProducts, setCarouselsWithProducts] = useState<CarouselWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) { setLoading(false); return; }

    const resolve = async () => {
      setLoading(true);

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

      // Filter by show_on_categories
      const productCategory = product.category || '';
      const filtered = carousels.filter(c => {
        const cats = (c as any).show_on_categories || ['all'];
        return cats.includes('all') || cats.some((cat: string) => productCategory.toLowerCase().includes(cat.toLowerCase()));
      });

      const sessionId = sessionStorage.getItem('scan_session_id') || '';
      const results: CarouselWithProducts[] = [];

      // Resolve via edge function
      for (const carousel of filtered) {
        try {
          const { data, error } = await supabase.functions.invoke('get-recommendations', {
            body: {
              product_id: product.id,
              carousel_id: carousel.id,
              user_session_id: sessionId,
              limit: (carousel.match_config as any)?.max_items || 12,
            },
          });

          if (error || !data?.products) continue;

          const minProducts = (carousel as any).min_products ?? 3;
          if (data.products.length < minProducts) continue;

          const products = data.products.map((p: any) => ({
            ...p,
            images: normalizeImages(p.images),
            wear_with: Array.isArray(p.wear_with) ? p.wear_with : [],
            you_may_also_like: Array.isArray(p.you_may_also_like) ? p.you_may_also_like : [],
          }));

          results.push({
            ...carousel,
            match_config: (carousel.match_config || {}) as Record<string, any>,
            layout: (carousel.layout || { card_size: 'small', columns: 4 }) as CarouselDefinition['layout'],
            show_on_categories: (carousel as any).show_on_categories || ['all'],
            display_position: (carousel as any).display_position || 'below_product_info',
            min_products: (carousel as any).min_products ?? 3,
            sort_by: (carousel as any).sort_by || 'newest',
            exclude_current: (carousel as any).exclude_current !== false,
            products,
            match_reason: data.match_reason,
          });
        } catch (err) {
          console.error(`Carousel ${carousel.name} failed:`, err);
        }
      }

      setCarouselsWithProducts(results);
      setLoading(false);
    };

    resolve();
  }, [product?.id]);

  return { carouselsWithProducts, loading };
};

/** Track a recommendation click */
export const trackRecommendationClick = async (
  sourceProductId: string,
  targetProductId: string,
  carouselId: string
) => {
  const sessionId = sessionStorage.getItem('scan_session_id') || '';
  await supabase.from('recommendation_clicks').insert({
    source_product_id: sourceProductId,
    target_product_id: targetProductId,
    carousel_id: carouselId,
    session_id: sessionId,
  } as any);
};
