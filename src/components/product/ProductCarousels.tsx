import { Link } from 'react-router-dom';
import { useProductCarousels, CarouselWithProducts, trackRecommendationClick } from '@/hooks/useProductCarousels';
import { Product } from '@/hooks/useProducts';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import { useProductLinkDestination } from '@/hooks/useProductLinkDestination';

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
  const { carouselsWithProducts, loading, skeletons } = useProductCarousels(product);

  const filtered = carouselsWithProducts.filter(c => (c.display_position || 'below_product_info') === position);
  const filteredSkeletons = (skeletons || []).filter(c => (c.display_position || 'below_product_info') === position);

  if (loading && filteredSkeletons.length > 0) {
    return (
      <>
        {filteredSkeletons.map(c => (
          <CarouselSkeleton key={`sk-${c.id}`} carousel={c} />
        ))}
      </>
    );
  }

  if (loading || filtered.length === 0) return null;

  return (
    <>
      {filtered.map(carousel => (
        <CarouselSection key={carousel.id} carousel={carousel} sourceProductId={product.id} />
      ))}
    </>
  );
};

const CarouselSkeleton = ({ carousel }: { carousel: CarouselWithProducts }) => {
  const cardSize = CARD_SIZES[carousel.layout.card_size] || CARD_SIZES.small;
  const displayTitle = carousel.dynamic_title || carousel.name;
  return (
    <section className="py-8 border-t border-border">
      <div className="px-5 mb-4">
        <h2
          className="text-xl sm:text-2xl m-0"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1a1a1a', fontWeight: 300 }}
        >
          {displayTitle}
        </h2>
        <p className="font-sans text-[10px] tracking-wide text-muted-foreground m-0 mt-1 italic">
          A curated selection chosen to complement this piece
        </p>
      </div>
      <div className="flex overflow-hidden" style={{ gap: 10, padding: '0 20px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0" style={{ minWidth: cardSize.minWidth, maxWidth: cardSize.maxWidth }}>
            <div className="rounded-lg overflow-hidden bg-card">
              <div className={`${cardSize.aspectClass} bg-secondary animate-pulse`} />
              <div className="p-2 pb-2.5 space-y-1.5">
                <div className="h-2.5 bg-secondary rounded animate-pulse w-3/4" />
                <div className="h-2 bg-secondary rounded animate-pulse w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const CarouselSection = ({ carousel, sourceProductId }: { carousel: CarouselWithProducts; sourceProductId: string }) => {
  const cardSize = CARD_SIZES[carousel.layout.card_size] || CARD_SIZES.small;
  const displayTitle = carousel.dynamic_title || carousel.name;
  const firstRuleId = carousel.matched_rule_ids?.[0] || null;
  const { getProductUrl, isExternal } = useProductLinkDestination();

  const handleClick = (targetId: string) => {
    trackRecommendationClick(sourceProductId, targetId, carousel.id, firstRuleId);
  };

  return (
    <section className="py-8 border-t border-border">
      <div className="px-5 mb-4">
        <h2
          className="text-xl sm:text-2xl m-0"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1a1a1a', fontWeight: 300 }}
        >
          {displayTitle}
        </h2>
        <p className="font-sans text-[10px] tracking-wide text-muted-foreground m-0 mt-1 italic">
          A curated selection chosen to complement this piece
        </p>
      </div>

      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ gap: 10, padding: '0 20px', WebkitOverflowScrolling: 'touch' }}
      >
        {carousel.products.map(p => {
          const skuImages = filterImagesBySku(p.images, p.product_code);
          const img = getFlatLayImage(skuImages, p.category) || p.images[0];
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
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
};

export default ProductCarousels;
