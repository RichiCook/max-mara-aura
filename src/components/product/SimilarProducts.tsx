import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeImages } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import { useProductLinkDestination } from '@/hooks/useProductLinkDestination';

interface SimilarProduct {
  id: string;
  name: string;
  price: string | null;
  images: string[];
  slug: string;
  category: string | null;
  collection: string | null;
  product_code: string | null;
  source_url: string | null;
}

interface SimilarProductsProps {
  productId: string;
  productCode: string | null;
  category: string | null;
  collection: string | null;
}

const SimilarProducts = ({ productId, productCode, category, collection }: SimilarProductsProps) => {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [enabled, setEnabled] = useState(true);
  const { getProductUrl, isExternal } = useProductLinkDestination();

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'similar_products_enabled')
      .single()
      .then(({ data }) => {
        const val = data?.value as any;
        if (val?.enabled === false) setEnabled(false);
      });
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!category && !collection) return;

      let query = supabase
        .from('products')
        .select('id, name, price, images, slug, category, collection, product_code, source_url')
        .neq('id', productId)
        .limit(12);

      if (category) {
        query = query.eq('category', category);
      } else if (collection) {
        query = query.eq('collection', collection);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setProducts(data.map(p => ({ ...p, images: normalizeImages(p.images) })));
      } else if (category && collection) {
        const { data: fallback } = await supabase
          .from('products')
          .select('id, name, price, images, slug, category, collection, product_code, source_url')
          .neq('id', productId)
          .eq('collection', collection)
          .limit(12);
        if (fallback) setProducts(fallback.map(p => ({ ...p, images: normalizeImages(p.images) })));
      }
    };
    fetch();
  }, [productId, category, collection]);

  if (!enabled || products.length === 0) return null;

  const getTag = (p: SimilarProduct): string | null => {
    if (collection && p.collection === collection) return p.collection;
    if (category) {
      const segments = category.split(' > ');
      const pSegments = (p.category || '').split(' > ');
      for (let i = segments.length - 1; i >= 0; i--) {
        if (pSegments.includes(segments[i])) return segments[i];
      }
    }
    return null;
  };

  return (
    <section className="py-8 border-t border-border">
      {/* Header */}
      <div className="px-5 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground opacity-50">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <h2 className="font-serif text-xl font-semibold text-foreground m-0">
            Similar Products
          </h2>
        </div>
        <span className="font-sans text-[11px] text-muted-foreground">Based on style</span>
      </div>

      {/* Carousel */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map(p => {
          const img = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
          const tag = getTag(p);
          const url = getProductUrl(p);
          const external = isExternal(p);
          const Wrapper = external ? 'a' : Link;
          const wrapperProps = external
            ? { href: url, target: '_blank', rel: 'noopener noreferrer' }
            : { to: url };
          return (
            <Wrapper
              key={p.id}
              {...(wrapperProps as any)}
              className="shrink-0 snap-start"
              style={{ minWidth: 148, maxWidth: 148, textDecoration: 'none' }}
            >
              <div className="rounded-lg overflow-hidden bg-card">
                {/* Full-bleed image — no border, no padding */}
                <div className="aspect-square bg-secondary flex items-center justify-center">
                  {img && (
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="p-2 pb-2.5">
                  <p className="font-sans text-[11px] font-medium text-foreground m-0 truncate">{p.name}</p>
                  {p.price && (
                    <p className="font-sans text-[11px] text-muted-foreground m-0 mt-0.5">{p.price}</p>
                  )}
                  {tag && (
                    <span className="inline-block mt-1 font-sans text-[9px] font-semibold text-accent bg-secondary border border-border rounded px-1.5 py-0.5">
                      {tag}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarProducts;
