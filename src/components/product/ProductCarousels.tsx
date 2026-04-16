import { Link } from 'react-router-dom';
import { useProductCarousels, CarouselWithProducts, trackRecommendationClick } from '@/hooks/useProductCarousels';
import { Product } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';

interface ProductCarouselsProps {
  product: Product;
  position?: string;
}

const CARD_SIZES = {
  small: { minWidth: 148, maxWidth: 148, aspectClass: 'aspect-square' },
  medium: { minWidth: 180, maxWidth: 180, aspectClass: 'aspect-[3/4]' },
  large: { minWidth: 240, maxWidth: 240, aspectClass: 'aspect-[3/4]' },
};

const ProductCarousels = ({ product, position = 'below_product_info' }: ProductCarouselsProps) => {
  const { carouselsWithProducts, loading } = useProductCarousels(product);

  if (loading || carouselsWithProducts.length === 0) return null;

  const filtered = carouselsWithProducts.filter(c => (c.display_position || 'below_product_info') === position);
  if (filtered.length === 0) return null;

  return (
    <>
      {filtered.map(carousel => (
        <CarouselSection key={carousel.id} carousel={carousel} sourceProductId={product.id} />
      ))}
    </>
  );
};

const CarouselSection = ({ carousel, sourceProductId }: { carousel: CarouselWithProducts; sourceProductId: string }) => {
  const cardSize = CARD_SIZES[carousel.layout.card_size] || CARD_SIZES.small;
  const displayTitle = carousel.dynamic_title || carousel.name;
  const firstRuleId = carousel.matched_rule_ids?.[0] || null;

  const handleClick = (targetId: string) => {
    trackRecommendationClick(sourceProductId, targetId, carousel.id, firstRuleId);
  };

  return (
    <section className="py-8 border-t border-border">
      <div className="px-5 mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground opacity-50">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <h2 className="font-serif text-xl font-semibold text-foreground m-0">
            {displayTitle}
          </h2>
        </div>
        <span className="font-sans text-[11px] text-muted-foreground">
          {carousel.match_reason || carousel.match_type}
        </span>
      </div>

      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}
      >
        {carousel.products.map(p => {
          const skuImages = filterImagesBySku(p.images, p.product_code);
          const img = getFlatLayImage(skuImages, p.category) || p.images[0];
          return (
            <Link
              key={p.id}
              to={`/product/${p.slug}`}
              className="shrink-0 snap-start"
              style={{ minWidth: cardSize.minWidth, maxWidth: cardSize.maxWidth, textDecoration: 'none' }}
              onClick={() => handleClick(p.id)}
            >
              <div className="rounded-lg overflow-hidden bg-card">
                <div className={`${cardSize.aspectClass} bg-secondary flex items-center justify-center`}>
                  {img && (
                    <img src={img} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  )}
                </div>
                <div className="p-2 pb-2.5">
                  <p className="font-sans text-[11px] font-medium text-foreground m-0 truncate">{p.name}</p>
                  {p.price && <p className="font-sans text-[11px] text-muted-foreground m-0 mt-0.5">{p.price}</p>}
                  {carousel.layout.card_size === 'large' && p.description && (
                    <p className="font-sans text-[10px] text-muted-foreground m-0 mt-1 line-clamp-2">{p.description}</p>
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

export default ProductCarousels;
