import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronRight, ExternalLink, ShoppingBag } from 'lucide-react';
import { getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import ProductPreviewSheet from './ProductPreviewSheet';
import { useShopifyCheckout } from '@/hooks/useShopifyCheckout';
import CheckoutModal from './CheckoutModal';

interface LookProduct {
  id: string;
  product_code: string;
  name: string;
  price: string | null;
  images: string[];
  slug: string;
  color: string | null;
  category: string | null;
  source_url: string | null;
  shopify_handle?: string | null;
}

interface GeneratedLook {
  product_codes: string[];
  hero_product_code?: string;
  name: string;
  description: string;
  color_palette: string[];
  reasoning: string;
  generated_at: string;
  look_image?: string;
  collage_image?: string;
  config?: any;
}

interface LookWithProducts {
  look: GeneratedLook;
  products: LookProduct[];
  lookImage: string | null;
  collageImage: string | null;
  generatingImage: boolean;
  generatingCollage: boolean;
}

interface LookCardV2Props {
  looks: LookWithProducts[];
  productCode: string;
  loading: boolean;
  loadingMore: boolean;
  onTrackEvent?: (eventType: string, productCode: string, options?: any) => void;
  onScroll?: (index: number) => void;
  calculateTotal: (products: LookProduct[]) => string | null;
  variant?: 'refined' | 'editorial';
  onGenerateCollage?: (lookIndex: number) => void;
  onGeneratePhoto?: (lookIndex: number) => void;
  initialModes?: Record<number, 'photo' | 'collage'>;
}

const LookCardV2 = ({ looks, productCode, loading, loadingMore, onTrackEvent, onScroll, calculateTotal, variant = 'refined', onGenerateCollage, onGeneratePhoto, initialModes }: LookCardV2Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<LookProduct | null>(null);
  const [modes, setModes] = useState<Record<number, 'photo' | 'collage'>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isReady: shopifyReady, handleCheckout, loading: shopifyLoading, checkoutUrl, closeCheckout } = useShopifyCheckout();

  const getMode = (idx: number): 'photo' | 'collage' => modes[idx] || initialModes?.[idx] || 'photo';
  const setMode = (idx: number, mode: 'photo' | 'collage') => {
    setModes(prev => ({ ...prev, [idx]: mode }));
    const l = looks[idx];
    if (!l) return;
    if (mode === 'collage' && !l.collageImage && !l.generatingCollage) {
      onGenerateCollage?.(idx);
    } else if (mode === 'photo' && !l.lookImage && !l.generatingImage) {
      onGeneratePhoto?.(idx);
    }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(idx);
    onScroll?.(idx);
  }, [onScroll]);

  const scrollToIndex = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="py-8 border-t" style={{ borderColor: '#e4e0db' }}>
        <div className="px-5 mb-4">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 14, color: '#1a1a1a' }}>✦</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.02em' }}>
              AI-Curated Looks
            </h2>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#b5ada5', marginLeft: 22, marginTop: 2 }}>
            Curating styling suggestions…
          </p>
        </div>
        {/* Shimmer loading card */}
        <div className="px-5">
          <div style={{ borderRadius: 8, border: '1px solid #e4e0db', overflow: 'hidden', background: '#fff' }}>
            <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden' }}>
              <div className="animate-shimmer" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, #f0ece7 30%, #f8f4f0 50%, #f0ece7 70%)', backgroundSize: '200% 100%' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, opacity: 0.25 }}>✦</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5, color: '#c5c0ba', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>GENERATING LOOK</span>
                <div style={{ width: 100, height: 1.5, borderRadius: 1, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <div className="animate-shimmer" style={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #d4c8bb, #8b7355)', borderRadius: 1 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (looks.length === 0) return null;

  return (
    <section className="py-8 border-t" style={{ borderColor: '#e4e0db' }}>
      {/* Header */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 14, color: '#1a1a1a' }}>✦</span>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.02em' }}>
            AI-Curated Looks
          </h2>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#b5ada5', marginLeft: 22, marginTop: 2 }}>
          {looks.length} styling suggestion{looks.length !== 1 ? 's' : ''} · swipe to browse
        </p>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', padding: variant === 'editorial' ? '0' : '0 20px', gap: 12 }}
        onScroll={handleScroll}
      >
        {looks.map((lookItem, lookIdx) => {
          const look = lookItem.look;
          const lookProducts = lookItem.products;
          const totalPrice = calculateTotal(lookProducts);
          const heroProduct = lookProducts.find(p => p.product_code === productCode || p.product_code === look.hero_product_code);
          const pairedProducts = lookProducts.filter(p => p.product_code !== productCode && p.product_code !== look.hero_product_code);
          const isNoteExpanded = expandedNotes.has(lookIdx);

          return (
            <div
              key={lookIdx}
              className="shrink-0 snap-center"
              style={{
                minWidth: variant === 'editorial' ? '100%' : 'calc(100% - 40px)',
                maxWidth: variant === 'editorial' ? '100%' : 'calc(100% - 40px)',
                marginRight: lookIdx < looks.length - 1 ? 12 : 0
              }}
            >
              <div style={{ borderRadius: variant === 'editorial' ? 0 : 8, border: variant === 'editorial' ? 'none' : '1px solid #e4e0db', background: '#fff', boxShadow: variant === 'editorial' ? 'none' : '0 1px 10px rgba(0,0,0,0.025)', overflow: 'hidden' }}>

                {/* v2.1 Editorial: Products ABOVE the look image */}
                {variant === 'editorial' && (
                  <div style={{ padding: '0', display: 'flex', gap: 0, paddingBottom: 8 }}>
                    {[heroProduct, ...pairedProducts].filter(Boolean).map((p) => {
                      if (!p) return null;
                      const thumb = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
                      const isHero = p.product_code === productCode || p.product_code === look.hero_product_code;
                      return (
                        <a
                          key={p.id}
                          href={p.source_url || '#'}
                          target={p.source_url ? '_blank' : undefined}
                          rel={p.source_url ? 'noopener noreferrer' : undefined}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            background: '#fff',
                            border: isHero ? '2px solid #8b7355' : '1px solid #f0ece7',
                            borderRadius: 0,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            textAlign: 'left' as const,
                            padding: 0,
                          }}
                        >
                          <div style={{ aspectRatio: '1/1', background: '#f7f7f5', overflow: 'hidden', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {thumb && (
                              <img src={thumb} alt={p.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1, minWidth: 0 }}>
                              {p.name}
                            </p>
                            {isHero && (
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600, color: '#fff', background: '#8b7355', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.02em', textTransform: 'uppercase' as const, flexShrink: 0 }}>Featured</span>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* AI Image / Collage */}
                {(() => {
                  const mode = getMode(lookIdx);
                  const isCollage = mode === 'collage';
                  const activeImage = isCollage ? lookItem.collageImage : lookItem.lookImage;
                  const isGenerating = isCollage ? lookItem.generatingCollage : lookItem.generatingImage;
                  const label = isCollage ? 'COMPOSING COLLAGE' : 'GENERATING LOOK';
                  const badge = isCollage ? '✦ Real Product Cutouts' : '✦ AI Generated';
                  return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 8px', background: '#fff', borderBottom: '1px solid #f0ece7' }}>
                    <div style={{ display: 'inline-flex', background: '#f7f3ee', border: '1px solid #e4e0db', borderRadius: 6, padding: 2 }}>
                      {(['photo', 'collage'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setMode(lookIdx, m)}
                          style={{
                            padding: '5px 10px', border: 'none', cursor: 'pointer',
                            background: mode === m ? '#1a1a1a' : 'transparent',
                            color: mode === m ? '#fff' : '#6b6258',
                            fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                            letterSpacing: '0.05em', textTransform: 'uppercase' as const, borderRadius: 4,
                          }}
                        >
                          {m === 'photo' ? 'Photo' : 'Collage'}
                        </button>
                      ))}
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#8b7355', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                      {isCollage ? 'Collage mode' : 'Photo mode'}
                    </span>
                  </div>
                <div style={{ aspectRatio: '3/4', position: 'relative', overflow: 'hidden', background: isCollage ? '#efeae3' : '#f0ece7' }}>
                  {isGenerating ? (
                    <>
                      <div className="animate-shimmer" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, #f0ece7 30%, #f8f4f0 50%, #f0ece7 70%)', backgroundSize: '200% 100%', zIndex: 1 }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1 }}>
                        <span style={{ fontSize: 16, opacity: 0.25 }}>✦</span>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5, color: '#c5c0ba', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>{label}</span>
                        <div style={{ width: 100, height: 1.5, borderRadius: 1, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                          <ProgressBar />
                        </div>
                      </div>
                    </>
                  ) : activeImage ? (
                    <>
                      <img src={activeImage} alt={look.name} style={{ width: '100%', height: '100%', objectFit: isCollage ? 'contain' : 'cover', zIndex: 2, position: 'relative' }} />
                      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', borderRadius: 5, padding: '4px 9px', fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 500, color: '#fff' }}>
                        {badge}
                      </div>
                    </>
                  ) : isCollage ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, textAlign: 'center' as const }}>
                      <span style={{ fontSize: 20, opacity: 0.4 }}>✦</span>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#8b7355', margin: 0, letterSpacing: '0.04em' }}>Generate a flat-lay collage of the products</p>
                      <button
                        onClick={() => onGenerateCollage?.(lookIdx)}
                        style={{ marginTop: 4, padding: '8px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer' }}
                      >
                        Create Collage
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, textAlign: 'center' as const }}>
                      <span style={{ fontSize: 20, opacity: 0.4 }}>✦</span>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#8b7355', margin: 0, letterSpacing: '0.04em' }}>Generate an AI photoshoot of this look</p>
                      <button
                        onClick={() => onGeneratePhoto?.(lookIdx)}
                        style={{ marginTop: 4, padding: '8px 14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 4, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', cursor: 'pointer' }}
                      >
                        Generate Photo
                      </button>
                    </div>
                  )}

                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '40px 16px 14px' }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>{look.name}</h3>
                    {look.description && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>{look.description}</p>
                    )}
                  </div>
                </div>
                </>
                  );
                })()}

                {/* v2.0 Refined: stacked product rows BELOW the image */}
                {variant !== 'editorial' && (
                  <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {heroProduct && (
                      <a
                        href={heroProduct.source_url || '#'}
                        target={heroProduct.source_url ? '_blank' : undefined}
                        rel={heroProduct.source_url ? 'noopener noreferrer' : undefined}
                        style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', cursor: heroProduct.source_url ? 'pointer' : 'default' }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 6, background: '#2a2a2a', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={getFlatLayImage(filterImagesBySku(heroProduct.images, heroProduct.product_code), heroProduct.category) || heroProduct.images[0]} alt={heroProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{heroProduct.name}</p>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', margin: '2px 0 0' }}>FEATURED</p>
                        </div>
                        {heroProduct.source_url && <ExternalLink style={{ width: 14, height: 14, stroke: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                      </a>
                    )}
                    {pairedProducts.map(p => {
                      const thumb = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPreviewProduct(p);
                            onTrackEvent?.('look_product_click', productCode, { targetProductCode: p.product_code, lookProductCodes: look.product_codes });
                          }}
                          style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', width: '100%', textAlign: 'left' as const }}
                        >
                          <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f7f7f5', overflow: 'hidden', flexShrink: 0 }}>
                            {thumb && <img src={thumb} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</p>
                          </div>
                          <ChevronRight style={{ width: 16, height: 16, stroke: '#ccc', strokeWidth: 1.5, flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* C. Total + CTA (hidden in editorial) */}
                {variant !== 'editorial' && (
                  <div style={{ padding: '14px 14px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#b5ada5' }}>Complete this look</span>
                      {totalPrice && (
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{totalPrice}</span>
                      )}
                    </div>
                    {shopifyReady && heroProduct?.shopify_handle ? (
                      <button
                        onClick={() => handleCheckout(heroProduct.shopify_handle!)}
                        disabled={shopifyLoading}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          width: '100%', padding: 13, borderRadius: 6,
                          background: '#1a1a1a', color: '#fff',
                          fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                          border: 'none', cursor: shopifyLoading ? 'wait' : 'pointer',
                          opacity: shopifyLoading ? 0.6 : 1,
                        }}
                      >
                        <ShoppingBag style={{ width: 14, height: 14, opacity: 0.5 }} />
                        {shopifyLoading ? 'Opening checkout…' : 'Add to Bag'}
                      </button>
                    ) : heroProduct?.source_url ? (
                      <a
                        href={heroProduct.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          width: '100%', padding: 13, borderRadius: 6,
                          background: '#1a1a1a', color: '#fff',
                          fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                          textDecoration: 'none', border: 'none', cursor: 'pointer'
                        }}
                      >
                        Check on our Store
                        <ExternalLink style={{ width: 13, height: 13, opacity: 0.5 }} />
                      </a>
                    ) : null}
                  </div>
                )}

                {/* D. Styling Note (hidden in editorial) */}
                {variant !== 'editorial' && look.reasoning && (
                  <div style={{ padding: '10px 14px 14px' }}>
                    <button
                      onClick={() => setExpandedNotes(prev => {
                        const next = new Set(prev);
                        next.has(lookIdx) ? next.delete(lookIdx) : next.add(lookIdx);
                        return next;
                      })}
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#c5c0ba', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Styling note {isNoteExpanded ? '▴' : '▾'}
                    </button>
                    <div style={{
                      maxHeight: isNoteExpanded ? 200 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 300ms ease'
                    }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#b5ada5', fontStyle: 'italic', lineHeight: 1.55, margin: '6px 0 0' }}>
                        {look.reasoning}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loadingMore && (
          <div className="shrink-0 snap-center flex items-center justify-center" style={{ minWidth: 'calc(100% - 40px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '40px 0' }}>
              <span style={{ fontSize: 16, opacity: 0.25 }} className="animate-pulse">✦</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#c5c0ba' }}>Generating more looks…</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination dots */}
      {looks.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 16, paddingTop: 12 }}>
          {looks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToIndex(idx)}
              style={{
                width: idx === currentIndex ? 18 : 5,
                height: 5,
                borderRadius: 3,
                background: idx === currentIndex ? '#1a1a1a' : '#ddd',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
              aria-label={`Go to look ${idx + 1}`}
            />
          ))}
          {loadingMore && (
            <div className="animate-pulse" style={{ width: 5, height: 5, borderRadius: 3, background: '#ddd' }} />
          )}
        </div>
      )}

      {/* Product Preview Sheet */}
      <ProductPreviewSheet
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
      />

      {/* Embedded Checkout Modal */}
      <CheckoutModal url={checkoutUrl} onClose={closeCheckout} />
    </section>
  );
};

/** Animated progress bar for image generation */
const ProgressBar = () => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const steps = [15, 30, 45, 55, 65, 75, 82, 88];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setWidth(steps[i]);
        i++;
      }
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: `${width}%`, height: '100%',
      background: 'linear-gradient(90deg, #d4c8bb, #8b7355)',
      borderRadius: 1, transition: 'width 0.6s ease'
    }} />
  );
};

export default LookCardV2;
