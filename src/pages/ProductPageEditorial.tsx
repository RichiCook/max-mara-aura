import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useProducts, Product } from '@/hooks/useProducts';
import { useProductActivations, useActivations, Activation } from '@/hooks/useActivations';
import { ActivationRenderer } from '@/components/activations/ActivationRenderer';
import { ProductGeneratedLook } from '@/components/ProductGeneratedLook';
import AtelierCompositions from '@/components/product/AtelierCompositions';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft, Settings, ShoppingBag, ArrowRight } from 'lucide-react';
import ShareToResaleModal from '@/components/ShareToResaleModal';
import { filterImagesBySku } from '@/utils/imageUtils';
import { useScanTracking } from '@/hooks/useScanTracking';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import AuraDigitalPassportCard from '@/components/product/AuraDigitalPassportCard';
import AuraPassportModal from '@/components/product/AuraPassportModal';
import ClaimOwnershipModal from '@/components/product/ClaimOwnershipModal';
import RegistrationSuccessModal from '@/components/product/RegistrationSuccessModal';
import CelebritySpotlight from '@/components/product/CelebritySpotlight';
import ProductCarousels from '@/components/product/ProductCarousels';
import { NewsletterSection } from '@/components/product/HeritageNewsletter';
import CertificationHistoryModal from '@/components/product/CertificationHistoryModal';
import { CampaignMediaSection } from '@/components/product/CampaignMediaSection';
import AuraLoginModal from '@/components/product/AuraLoginModal';
import TransferOwnershipModal from '@/components/product/TransferOwnershipModal';
import RedeemArtworkModal from '@/components/product/RedeemArtworkModal';

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

// Editorial palette
const ED = {
  bg: '#F2EDE8',
  card: '#FAF8F5',
  ink: '#1A1A1A',
  muted: '#8A857E',
  rule: '#E5E0DA',
  accent: '#D4768C',
  accentWarm: '#E8956A',
  dark: '#1A1A1A',
  darkText: '#F5F0EB',
  conciergeBg: '#EBE4DC',
};

const fontSerif = "'Playfair Display', 'Cormorant Garamond', Georgia, serif";
const fontSans = "'Inter', -apple-system, system-ui, sans-serif";
const fontMono = "'JetBrains Mono', 'IBM Plex Mono', 'Space Mono', monospace";

const MonoLabel = ({ children, style, dash = true }: { children: React.ReactNode; style?: React.CSSProperties; dash?: boolean }) => (
  <span
    style={{
      fontFamily: fontMono,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: ED.muted,
      ...style,
    }}
  >
    {dash ? '— ' : ''}{children}
  </span>
);

const SectionHeading = ({ label, title, italic = false }: { label?: string; title: string; italic?: boolean }) => (
  <div style={{ marginBottom: 24 }}>
    {label && <div style={{ marginBottom: 10 }}><MonoLabel>{label}</MonoLabel></div>}
    <h2
      style={{
        fontFamily: fontSerif,
        fontWeight: 400,
        fontSize: 'clamp(24px, 4vw, 32px)',
        lineHeight: 1.15,
        color: ED.ink,
        margin: 0,
        fontStyle: italic ? 'italic' : 'normal',
      }}
    >
      {title}
    </h2>
  </div>
);

const ProductPageEditorial = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProductBySlug } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [aiLooksEnabled, setAiLooksEnabled] = useState(false);
  const [conciergeInput, setConciergeInput] = useState('');

  // Aura state
  const [passportOpen, setPassportOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [ownerRegistered, setOwnerRegistered] = useState(() => localStorage.getItem('aura_ownership_claimed') === 'true');
  const [claimDate, setClaimDate] = useState<string | null>(() => localStorage.getItem('aura_claim_date'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: ED.bg }}>
        <div style={{ fontFamily: fontMono, fontSize: 11, letterSpacing: '0.2em', color: ED.muted }}>LOADING…</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: ED.bg }}>
        <h1 style={{ fontFamily: fontSerif, fontSize: 28, color: ED.ink }}>Product not found</h1>
        <Link to="/" style={{ marginTop: 16, fontFamily: fontMono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: ED.muted }}>← Back</Link>
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

  const allActivations = [
    ...productActivations.filter(pa => pa.activation).map(pa => pa.activation!),
    ...autoMatchedActivations,
  ];
  const getActivationPosition = (a: Activation): string => (a.content as any)?.position || 'after_compositions';
  const renderActivationsForPosition = (position: string) => {
    const matched = allActivations.filter(a => getActivationPosition(a) === position);
    if (matched.length === 0) return null;
    return (
      <section style={{ padding: '32px 0' }}>
        <div className="space-y-6">
          {matched.map(activation => (
            <div key={activation.id} className={activation.full_width ? '' : 'max-w-6xl mx-auto px-5'}>
              <ActivationRenderer activation={activation} />
            </div>
          ))}
        </div>
      </section>
    );
  };

  const handleLoginSuccess = () => { setLoginOpen(false); setTimeout(() => setClaimOpen(true), 300); };
  const handleClaimSuccess = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    setOwnerRegistered(true); setClaimDate(dateStr);
    localStorage.setItem('aura_ownership_claimed', 'true');
    localStorage.setItem('aura_claim_date', dateStr);
    setSuccessOpen(true);
  };

  // Split italic accent from product name (last word becomes italic)
  const nameParts = (() => {
    const parts = product.name.trim().split(' ');
    if (parts.length < 2) return { main: product.name, italic: '' };
    return { main: parts.slice(0, -1).join(' '), italic: parts.slice(-1)[0] };
  })();

  const conciergeChips = [
    'Does the chain detach?',
    'What fits inside the Mini?',
    'How do I care for patent?',
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: ED.bg, color: ED.ink }}>
      {/* Google Fonts for editorial layout */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap"
      />

      {/* Top marquee */}
      <div style={{ borderBottom: `1px solid ${ED.rule}`, background: ED.bg }}>
        <div className="max-w-6xl mx-auto px-5 py-2 text-center" style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.24em', color: ED.muted, textTransform: 'uppercase' }}>
          {(settings.brand_name || 'Studio').toUpperCase()} · {product.name.toUpperCase()}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: `${ED.bg}f0`, backdropFilter: 'blur(10px)', borderBottom: `1px solid ${ED.rule}` }}>
        <div className="max-w-6xl mx-auto px-5 py-4 grid grid-cols-3 items-center">
          <div>
            <Link to="/" style={{ color: ED.ink, textDecoration: 'none', fontFamily: fontMono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              ← Back
            </Link>
          </div>
          <div className="text-center">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.brand_name || 'Logo'} style={{ height: 22, width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
            ) : (
              <span style={{ fontFamily: fontSerif, fontSize: 18, fontWeight: 500, color: ED.ink }}>
                {settings.brand_name || 'Studio'}
              </span>
            )}
          </div>
          <div className="flex justify-end items-center gap-3">
            <Link to={`/product/${slug}/edit`} style={{ color: ED.ink }} title="Edit">
              <Settings className="w-4 h-4" />
            </Link>
            <ShoppingBag className="w-4 h-4" style={{ color: ED.ink }} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-0 md:px-5" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="grid md:grid-cols-12 gap-0 md:gap-12">
          {/* Image */}
          <div className="md:col-span-7 md:sticky md:top-24 md:self-start">
            {images.length > 0 ? (
              <>
                <div className="sm:hidden">
                  <div
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (idx !== currentImage) setCurrentImage(idx);
                    }}
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="w-full shrink-0 snap-center aspect-[3/4]" style={{ background: ED.card }}>
                        {!imageError[idx] ? (
                          <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-contain"
                            onError={() => setImageError(prev => ({ ...prev, [idx]: true }))}
                            loading={idx === 0 ? 'eager' : 'lazy'} referrerPolicy="no-referrer" />
                        ) : <div className="w-full h-full" />}
                      </div>
                    ))}
                  </div>
                  {images.length > 1 && (
                    <div className="flex justify-center gap-2 py-4">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentImage(idx)} aria-label={`image ${idx + 1}`}
                          style={{
                            width: idx === currentImage ? 18 : 6, height: 6, borderRadius: 999,
                            background: idx === currentImage ? ED.ink : ED.rule, border: 'none',
                            transition: 'all 200ms ease', padding: 0, cursor: 'pointer',
                          }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block relative">
                  <div className="aspect-[3/4]" style={{ background: ED.card }}>
                    {!imageError[currentImage] ? (
                      <img src={images[currentImage]} alt={product.name} className="w-full h-full object-contain"
                        onError={() => setImageError(prev => ({ ...prev, [currentImage]: true }))}
                        loading="eager" referrerPolicy="no-referrer" />
                    ) : <div className="w-full h-full" />}
                  </div>
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImage} aria-label="prev"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: `1px solid ${ED.rule}`, width: 40, height: 40, borderRadius: 999, cursor: 'pointer' }}>
                        <ChevronLeft className="w-5 h-5 mx-auto" style={{ color: ED.ink }} />
                      </button>
                      <button onClick={nextImage} aria-label="next"
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: `1px solid ${ED.rule}`, width: 40, height: 40, borderRadius: 999, cursor: 'pointer' }}>
                        <ChevronRight className="w-5 h-5 mx-auto" style={{ color: ED.ink }} />
                      </button>
                      <div className="flex justify-center gap-2 py-5">
                        {images.map((_, idx) => (
                          <button key={idx} onClick={() => setCurrentImage(idx)} aria-label={`image ${idx + 1}`}
                            style={{
                              width: idx === currentImage ? 24 : 6, height: 6, borderRadius: 999,
                              background: idx === currentImage ? ED.ink : ED.rule, border: 'none',
                              transition: 'all 200ms ease', padding: 0, cursor: 'pointer',
                            }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center" style={{ background: ED.card }}>
                <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.2em', color: ED.muted }}>NO IMAGE</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:col-span-5 px-5 md:px-0" style={{ paddingTop: 32 }}>
            <div style={{ marginBottom: 18 }}>
              <span style={{ fontFamily: fontMono, fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: ED.muted }}>
                ATELIER EDITION · 248 / 500
              </span>
            </div>

            <h1 style={{
              fontFamily: fontSerif, fontWeight: 400,
              fontSize: 'clamp(32px, 5vw, 42px)', lineHeight: 1.05,
              color: ED.ink, margin: 0, letterSpacing: '-0.01em',
            }}>
              {nameParts.main}
              {nameParts.italic && (
                <>
                  {' '}<span style={{ fontStyle: 'italic', color: ED.accent }}>{nameParts.italic}.</span>
                </>
              )}
            </h1>

            <div style={{ marginTop: 14 }}>
              <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: ED.muted }}>
                MADE IN ITALY
              </span>
            </div>

            <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              {product.price && (
                <span style={{ fontFamily: fontSans, fontSize: 22, fontWeight: 400, color: ED.ink }}>
                  {product.price}
                </span>
              )}
              {product.product_code && (
                <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ED.muted }}>
                  REF · {product.product_code}
                </span>
              )}
            </div>

            <div style={{ marginTop: 32 }}>
              <AuraDigitalPassportCard onOpenPassport={() => setPassportOpen(true)} ownerRegistered={ownerRegistered} />
            </div>

            {product.description && (
              <div style={{ marginTop: 36 }}>
                <div style={{ height: 1, background: ED.rule, marginBottom: 24 }} />
                <p style={{
                  fontFamily: fontSerif, fontSize: 16, lineHeight: 1.7, color: '#3a3531', margin: 0, fontWeight: 400,
                }}>
                  {product.description}
                </p>
              </div>
            )}

            {product.composition && (
              <div style={{ marginTop: 40 }}>
                <div style={{ marginBottom: 14 }}><MonoLabel>Composition</MonoLabel></div>
                <div style={{ height: 1, background: ED.rule, marginBottom: 18 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                  <span style={{ fontFamily: fontMono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: ED.muted }}>
                    MATERIAL
                  </span>
                  <span style={{ fontFamily: fontSerif, fontSize: 15, color: ED.ink, textAlign: 'right' }}>
                    {product.composition}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Activations */}
      {renderActivationsForPosition('above_product_info')}
      {renderActivationsForPosition('below_product_info')}

      {/* Concierge */}
      <section style={{ background: ED.conciergeBg, padding: '72px 0', marginTop: 24 }}>
        <div className="max-w-3xl mx-auto px-5">
          <div style={{ marginBottom: 12 }}><MonoLabel>Concierge</MonoLabel></div>
          <h2 style={{
            fontFamily: fontSerif, fontStyle: 'italic', fontWeight: 400,
            fontSize: 'clamp(28px, 4vw, 36px)', color: ED.ink, margin: 0, marginBottom: 28,
          }}>
            Ask the atelier.
          </h2>

          <div style={{ background: ED.card, padding: '20px 22px', borderRadius: 4, marginBottom: 20, border: `1px solid ${ED.rule}` }}>
            <p style={{ fontFamily: fontSerif, fontSize: 16, lineHeight: 1.6, color: ED.ink, margin: 0 }}>
              I'm the atelier. Ask about leather, the chain, or what fits inside.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {conciergeChips.map((chip) => (
              <button key={chip} onClick={() => setConciergeInput(chip)}
                style={{
                  fontFamily: fontSans, fontSize: 13, color: ED.ink,
                  background: 'transparent', border: `1px solid ${ED.ink}`,
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = ED.ink; e.currentTarget.style.color = ED.darkText; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ED.ink; }}
              >
                {chip}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: ED.card, border: `1px solid ${ED.rule}`, borderRadius: 999, padding: '6px 6px 6px 20px' }}>
            <input
              value={conciergeInput}
              onChange={(e) => setConciergeInput(e.target.value)}
              placeholder="Type a question…"
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: fontSans, fontSize: 14, color: ED.ink, padding: '10px 0',
              }}
            />
            <button aria-label="Send"
              style={{
                width: 38, height: 38, borderRadius: 999, border: 'none',
                background: ED.ink, color: ED.darkText, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Carousels */}
      <section className="max-w-6xl mx-auto px-5" style={{ paddingTop: 64 }}>
        <ProductCarousels product={product} position="below_product_info" />
      </section>

      {/* Campaign */}
      <section style={{ paddingTop: 48 }}>
        <div className="max-w-6xl mx-auto px-5" style={{ marginBottom: 16 }}>
          <MonoLabel>From the Campaign</MonoLabel>
        </div>
        <div className="max-w-6xl mx-auto px-5">
          <CampaignMediaSection />
        </div>
      </section>

      {/* Celebrity */}
      <section style={{ paddingTop: 64 }}>
        <CelebritySpotlight productCode={product.product_code} productCategory={product.category} />
      </section>

      {renderActivationsForPosition('after_celebrity')}

      {/* Atelier compositions / Looks */}
      <section style={{ paddingTop: 64 }}>
        <div className="max-w-6xl mx-auto px-5" style={{ marginBottom: 16 }}>
          <MonoLabel>Atelier Compositions</MonoLabel>
        </div>
        {aiLooksEnabled ? (
          product.product_code && (
            <ProductGeneratedLook
              productCode={product.product_code}
              cachedLook={(product as any).generated_look || null}
              onTrackEvent={trackEvent}
              onColorPaletteReady={() => {}}
            />
          )
        ) : (
          <AtelierCompositions currentProduct={product ? {
            name: product.name, slug: product.slug, price: product.price,
            images: product.images, category: product.category, product_code: product.product_code,
          } : undefined} />
        )}
      </section>

      {renderActivationsForPosition('after_compositions')}
      {renderActivationsForPosition('before_heritage')}

      {/* Newsletter */}
      <section style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="max-w-6xl mx-auto px-5" style={{ marginBottom: 16 }}>
          <MonoLabel>Stay in the Know</MonoLabel>
        </div>
        <NewsletterSection />
      </section>

      {renderActivationsForPosition('before_similar')}
      <ProductCarousels product={product} position="bottom" />

      {/* Footer */}
      <footer style={{ background: ED.dark, color: ED.darkText, padding: '32px 0', marginTop: 48 }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between flex-wrap gap-3">
          <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>
            {settings.brand_name || 'Studio'}
          </span>
          <span style={{ fontFamily: fontMono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5 }}>
            Product Intelligence
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AuraPassportModal
        open={passportOpen} onClose={() => setPassportOpen(false)}
        productName={product.name} productCode={product.product_code}
        ownerRegistered={ownerRegistered}
        onOpenClaim={() => setLoginOpen(true)}
        onOpenTransfer={() => setTransferOpen(true)}
        onOpenRedeem={() => setRedeemOpen(true)}
        claimDate={claimDate}
      />
      <AuraLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLoginSuccess={handleLoginSuccess} />
      <ClaimOwnershipModal open={claimOpen} onClose={() => setClaimOpen(false)}
        productName={product.name} productImage={images[0] || null} onSuccess={handleClaimSuccess} />
      <RegistrationSuccessModal open={successOpen} onClose={() => setSuccessOpen(false)}
        productName={product.name} productImage={images[0] || null}
        onViewPassport={() => setPassportOpen(true)} />
      <CertificationHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)}
        productName={product.name} ownerRegistered={ownerRegistered} claimDate={claimDate} />
      <TransferOwnershipModal open={transferOpen} onClose={() => setTransferOpen(false)} />
      <RedeemArtworkModal open={redeemOpen} onClose={() => setRedeemOpen(false)} />
      <ShareToResaleModal open={shareModalOpen} onOpenChange={setShareModalOpen} product={product} />
    </div>
  );
};

export default ProductPageEditorial;
