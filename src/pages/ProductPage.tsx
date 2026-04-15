import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useProducts, Product } from '@/hooks/useProducts';
import { useProductActivations, useActivations } from '@/hooks/useActivations';
import { ActivationRenderer } from '@/components/activations/ActivationRenderer';
import { ProductGeneratedLook } from '@/components/ProductGeneratedLook';
import AtelierCompositions from '@/components/product/AtelierCompositions';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import ShareToResaleModal from '@/components/ShareToResaleModal';
import { filterImagesBySku } from '@/utils/imageUtils';
import { useScanTracking } from '@/hooks/useScanTracking';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import GenuineProductBanner from '@/components/product/GenuineProductBanner';
import ProductInfoBlock from '@/components/product/ProductInfoBlock';
import OwnershipStatusBar from '@/components/product/OwnershipStatusBar';
import AuraDigitalPassportCard from '@/components/product/AuraDigitalPassportCard';
import AuraPassportModal from '@/components/product/AuraPassportModal';
import ClaimOwnershipModal from '@/components/product/ClaimOwnershipModal';
import RegistrationSuccessModal from '@/components/product/RegistrationSuccessModal';
import CelebritySpotlight from '@/components/product/CelebritySpotlight';
import SimilarProducts from '@/components/product/SimilarProducts';
import { HeritageSection, NewsletterSection } from '@/components/product/HeritageNewsletter';
import CertificationHistoryModal from '@/components/product/CertificationHistoryModal';

const DEMO_PRODUCT: Product = {
  id: 'demo-louboutin',
  name: 'So Kate 120mm',
  slug: 'demo',
  price: '€695',
  product_code: '3160688BK01',
  description: "The iconic So Kate 120mm pump features Christian Louboutin's signature red lacquered sole. Crafted in Italy from lustrous patent leather with a sleek pointed toe and stiletto heel, this timeless silhouette embodies Parisian glamour at its most refined.",
  composition: '100% Patent Calf Leather, 100% Leather Sole',
  category: 'Shoes',
  collection: 'Iconic',
  images: [],
  source_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  care_instructions: null,
  wear_with: [],
  you_may_also_like: [],
};

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProductBySlug } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [lookPalette, setLookPalette] = useState<string[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [resaleSharingEnabled, setResaleSharingEnabled] = useState(false);
  const [aiLooksEnabled, setAiLooksEnabled] = useState(false);

  // Aura state
  const [passportOpen, setPassportOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [ownerRegistered, setOwnerRegistered] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { trackEvent } = useScanTracking();
  const { settings } = usePlatformSettingsContext();

  const { productActivations } = useProductActivations(product?.id || '');
  const { activations } = useActivations();

  const productCategorySegments = product?.category
    ? product.category.split(' > ').map(s => s.trim()).filter(s => s)
    : [];
  const productCollection = (product as any)?.collection || null;
  const productPrice = (() => {
    const priceStr = product?.price || '';
    const priceNum = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(priceNum) ? null : priceNum;
  })();

  const autoMatchedByTargeting = activations.filter(activation => {
    const hasCategories = activation.categories && activation.categories.length > 0;
    const hasCollections = activation.collections && activation.collections.length > 0;
    const hasPriceRange = activation.price_min !== null || activation.price_max !== null;
    const now = new Date();
    if (activation.start_date && new Date(activation.start_date) > now) return false;
    if (activation.end_date && new Date(activation.end_date) < now) return false;
    if (!hasCategories && !hasCollections && !hasPriceRange) return true;
    const categoryMatch = !hasCategories || activation.categories!.some(cat => productCategorySegments.includes(cat));
    const collectionMatch = !hasCollections || (productCollection && activation.collections!.includes(productCollection));
    let priceMatch = true;
    if (hasPriceRange && productPrice !== null) {
      const minOk = activation.price_min === null || productPrice >= activation.price_min;
      const maxOk = activation.price_max === null || productPrice <= activation.price_max;
      priceMatch = minOk && maxOk;
    }
    const criteria = [];
    if (hasCategories) criteria.push(categoryMatch);
    if (hasCollections) criteria.push(collectionMatch);
    if (hasPriceRange) criteria.push(priceMatch);
    return criteria.every(c => c);
  });

  const manualActivationIds = new Set(productActivations.map(pa => pa.activation_id));
  const autoMatchedActivations = autoMatchedByTargeting.filter(a => !manualActivationIds.has(a.id));

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'resale_sharing_enabled').single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as { enabled?: boolean };
          setResaleSharingEnabled(val.enabled ?? false);
        }
      });
    // AI-Curated Looks toggle — disabled by default, Atelier Compositions shown instead
    supabase.from('app_settings').select('value').eq('id', 'ai_looks_enabled').single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as { enabled?: boolean };
          setAiLooksEnabled(val.enabled ?? false);
        }
      });
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      setLoading(true);
      const p = await getProductBySlug(slug);
      setProduct(p || DEMO_PRODUCT);
      setLoading(false);
      if (p?.product_code) {
        const ref = searchParams.get('ref');
        const source = ref === 'qr' ? 'qr_scan' : 'direct';
        trackEvent('page_view', p.product_code, {
          metadata: { collection: (p as any).collection, category: p.category, source },
        });
        if (ref) {
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
        }
      }
    };
    loadProduct();
  }, [slug]);

  // Color resolution helpers
  const colorNameToHex = (name: string): string | null => {
    const map: Record<string, string> = {
      nero: '#1a1a1a', black: '#1a1a1a', bianco: '#f5f5f5', white: '#f5f5f5',
      rosso: '#c0392b', red: '#c0392b', blu: '#2c3e99', blue: '#2c3e99',
      verde: '#27ae60', green: '#27ae60', giallo: '#f1c40f', yellow: '#f1c40f',
      rosa: '#e08e9d', pink: '#e08e9d', marrone: '#6d4c41', brown: '#6d4c41',
      beige: '#d4c5a9', oro: '#c9a84c', gold: '#c9a84c', argento: '#b0b0b0', silver: '#b0b0b0',
    };
    const key = name.toLowerCase().trim();
    if (map[key]) return map[key];
    for (const [k, v] of Object.entries(map)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return null;
  };

  const resolveColor = (c: string): string | null => {
    if (/^#[0-9a-f]{3,8}$/i.test(c)) return c;
    return colorNameToHex(c);
  };

  const resolvedPalette = useMemo(() => lookPalette.map(resolveColor).filter(Boolean) as string[], [lookPalette]);

  const hexToHSL = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const paletteStyle = useMemo(() => {
    if (resolvedPalette.length === 0) return undefined;
    const primary = hexToHSL(resolvedPalette[0]);
    const accent = resolvedPalette.length > 1 ? hexToHSL(resolvedPalette[1]) : primary;
    const tertiary = resolvedPalette.length > 2 ? hexToHSL(resolvedPalette[2]) : accent;
    if (!primary) return undefined;
    return {
      '--look-primary': `${primary.h} ${primary.s}% ${primary.l}%`,
      '--look-accent': accent ? `${accent.h} ${accent.s}% ${accent.l}%` : undefined,
      '--look-tertiary': tertiary ? `${tertiary.h} ${tertiary.s}% ${tertiary.l}%` : undefined,
    } as React.CSSProperties;
  }, [resolvedPalette]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-light text-foreground mb-4">Product not found</h1>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Back to Home</Link>
        </Button>
      </div>
    );
  }

  const images = filterImagesBySku(
    (product.images || [])
      .filter((img: string) => !img.includes('thumbnail') && !img.includes('swatch'))
      .map((img: string) => img.split('#')[0]),
    product.product_code
  );

  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  const handleClaimSuccess = () => {
    setOwnerRegistered(true);
    setSuccessOpen(true);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-700 overflow-x-hidden" style={paletteStyle}>
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 transition-colors duration-700" style={resolvedPalette.length > 0 ? { backgroundColor: resolvedPalette[0] + '10', borderColor: resolvedPalette[0] + '25', backdropFilter: 'blur(12px)' } : { backdropFilter: 'blur(12px)', backgroundColor: '#fff' }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.brand_name || 'Logo'} className="h-6 sm:h-8 w-auto object-contain" />
            ) : (
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                Christian Louboutin
              </span>
            )}
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to={`/product/${slug}/edit`}>
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">Edit</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="sm:container sm:max-w-6xl sm:mx-auto sm:px-4 sm:py-10">
        <div className="grid md:grid-cols-2 gap-0 sm:gap-10">
          {/* Image Gallery */}
          <div className="relative">
            {images.length > 0 ? (
              <>
                {/* Mobile gallery */}
                <div className="sm:hidden">
                  <div
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (idx !== currentImage) setCurrentImage(idx);
                    }}
                    ref={(el) => {
                      if (el && el.children[currentImage]) {
                        const target = el.children[currentImage] as HTMLElement;
                        if (Math.abs(el.scrollLeft - target.offsetLeft) > 10) {
                          el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
                        }
                      }
                    }}
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="w-full shrink-0 snap-center aspect-[3/4] bg-white">
                        {!imageError[idx] ? (
                          <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-contain"
                            onError={() => setImageError(prev => ({ ...prev, [idx]: true }))}
                            loading={idx === 0 ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Image unavailable</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {images.length > 1 && (
                    <div className="flex justify-center gap-1.5 py-3">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImage(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${idx === currentImage ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                          aria-label={`Go to image ${idx + 1}`} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop gallery */}
                <div className="hidden sm:block">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white">
                    {!imageError[currentImage] ? (
                      <img src={images[currentImage]} alt={product.name} className="w-full h-full object-contain"
                        onError={() => setImageError(prev => ({ ...prev, [currentImage]: true }))}
                        loading="eager" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Image unavailable</div>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3">
                      <Button variant="secondary" size="icon" onClick={prevImage} className="rounded-full shadow-lg h-10 w-10 opacity-80 hover:opacity-100"><ChevronLeft className="w-5 h-5" /></Button>
                      <Button variant="secondary" size="icon" onClick={nextImage} className="rounded-full shadow-lg h-10 w-10 opacity-80 hover:opacity-100"><ChevronRight className="w-5 h-5" /></Button>
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {images.map((img, idx) => (
                        <button key={idx} onClick={() => setCurrentImage(idx)}
                          className={`w-16 h-20 rounded overflow-hidden shrink-0 border-2 transition-colors ${idx === currentImage ? 'border-primary' : 'border-transparent hover:border-border'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-[3/4] sm:rounded-lg flex items-center justify-center" style={{ background: '#f5f0eb' }}>
                <div className="text-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1" style={{ margin: '0 auto 12px' }}>
                    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: '#C4A265' }}>Christian Louboutin</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#999', marginTop: 4 }}>Product Image</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ownership Status Bar */}
      <OwnershipStatusBar onClick={() => setPassportOpen(true)} />

      {/* Genuine Product Banner + Badges */}
      <GenuineProductBanner
        productName={product.name}
        collection={(product as any).collection}
        onViewPassport={() => setPassportOpen(true)}
      />

      {/* Aura Digital Passport Card */}
      <AuraDigitalPassportCard
        onOpenClaim={() => setClaimOpen(true)}
        onOpenPassport={() => setPassportOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <ProductInfoBlock
        price={product.price}
        productCode={product.product_code}
        description={product.description}
        composition={product.composition}
        sourceUrl={product.source_url}
        productName={product.name}
        productId={product.id}
      />

      {/* Aura Modals */}
      <AuraPassportModal
        open={passportOpen}
        onClose={() => setPassportOpen(false)}
        productName={product.name}
        productCode={product.product_code}
        ownerRegistered={ownerRegistered}
        onOpenClaim={() => setClaimOpen(true)}
      />
      <ClaimOwnershipModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        productName={product.name}
        onSuccess={handleClaimSuccess}
      />
      <RegistrationSuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        productName={product.name}
        onViewPassport={() => setPassportOpen(true)}
      />
      <CertificationHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        productName={product.name}
        ownerRegistered={ownerRegistered}
      />

      <ShareToResaleModal open={shareModalOpen} onOpenChange={setShareModalOpen} product={product} />

      {/* Celebrity Spotlight */}
      <CelebritySpotlight productCode={product.product_code} productCategory={product.category} />

      {/* AI-Curated Total Look (toggle) or Atelier Compositions (default) */}
      {aiLooksEnabled ? (
        product.product_code && (
          <ProductGeneratedLook
            productCode={product.product_code}
            cachedLook={(product as any).generated_look || null}
            onTrackEvent={trackEvent}
            onColorPaletteReady={setLookPalette}
          />
        )
      ) : (
        <AtelierCompositions currentProduct={product ? {
          name: product.name,
          slug: product.slug,
          price: product.price,
          images: product.images,
          category: product.category,
          product_code: product.product_code,
        } : undefined} />
      )}

      {/* Activations */}
      {(productActivations.length > 0 || autoMatchedActivations.length > 0) && (
        <section className="py-6 sm:py-8">
          <div className="space-y-6">
            {productActivations.map((pa) =>
              pa.activation ? (
                <div key={pa.id} className={pa.activation.full_width ? '' : 'max-w-6xl mx-auto px-4'}>
                  <ActivationRenderer activation={pa.activation} />
                </div>
              ) : null
            )}
            {autoMatchedActivations.map((activation) => (
              <div key={activation.id} className={activation.full_width ? '' : 'max-w-6xl mx-auto px-4'}>
                <ActivationRenderer activation={activation} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Heritage Section */}
      <HeritageSection />

      {/* Newsletter Section */}
      <NewsletterSection />

      {/* Similar Products */}
      {product.product_code && (
        <SimilarProducts productId={product.id} productCode={product.product_code} category={product.category} collection={(product as any).collection} />
      )}

      {/* Wear With */}
      {product.wear_with && product.wear_with.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <h2 className="text-lg sm:text-2xl font-light text-foreground mb-4 sm:mb-6">Complete the Look</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {product.wear_with.slice(0, 4).map((item: any, idx: number) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                </div>
                <p className="text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                {item.price && <p className="text-xs text-muted-foreground">{item.price}</p>}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* You May Also Like */}
      {product.you_may_also_like && product.you_may_also_like.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-6 sm:py-10" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <h2 className="text-lg sm:text-2xl font-light text-foreground mb-4 sm:mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {product.you_may_also_like.slice(0, 4).map((item: any, idx: number) => (
              <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="group">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-secondary mb-2">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
                </div>
                <p className="text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                {item.price && <p className="text-xs text-muted-foreground">{item.price}</p>}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-6 sm:mt-10" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a', opacity: 0.4 }}>
                Louboutin × Aura Blockchain
              </span>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#ccc', marginTop: 2 }}>
                Powered by Aitems · Product Intelligence
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/">
                <ArrowLeft className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProductPage;
