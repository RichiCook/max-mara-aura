/**
 * Atelier Compositions — AI-composed still-life images using real product photos.
 * Always includes the current page's product in every composition.
 * Preloads cached images from storage before triggering AI generation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, X, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import ProductPreviewSheet from './ProductPreviewSheet';
import { normalizeImages } from '@/hooks/useProducts';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────

interface CompositionProduct {
  name: string;
  price: string;
  image?: string;
  slug?: string;
}

interface Composition {
  id: string;
  name: string;
  styleTag: string;
  products: CompositionProduct[];
  generatedImage?: string;
  loading?: boolean;
}

interface AtelierCompositionsProps {
  currentProduct?: {
    name: string;
    slug: string;
    price: string | null;
    images: string[];
    category: string | null;
    product_code: string | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function toCompProduct(p: { name: string; slug: string; price: string; image: string }): CompositionProduct {
  return { name: p.name, price: p.price, image: p.image, slug: p.slug };
}

// ── Build compositions always including the main product ─────

async function buildCompositions(
  mainProduct: AtelierCompositionsProps['currentProduct']
): Promise<Composition[]> {
  const { data: allProducts, error } = await supabase
    .from('products')
    .select('name, slug, price, images, category')
    .not('images', 'is', null)
    .limit(500);

  if (error || !allProducts?.length) return [];

  const withImages = allProducts
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price || '',
      image: normalizeImages(p.images)[0] || '',
      category: p.category || '',
    }))
    .filter((p) => p.image && p.slug !== mainProduct?.slug);

  // Main product as a CompositionProduct
  const mainCP: CompositionProduct | null = mainProduct
    ? {
        name: mainProduct.name,
        price: mainProduct.price || '',
        image: mainProduct.images[0] || '',
        slug: mainProduct.slug,
      }
    : null;

  if (!mainCP || !mainCP.image) return [];

  // Categorise companion products
  const byCategory = (keyword: string) => withImages.filter((p) => p.category.includes(keyword));
  const escarpins = byCategory('Escarpins');
  const bags = byCategory('Sacs');
  const parfums = byCategory('Parfums');
  const levres = byCategory('Lèvres');
  const ongles = byCategory('Ongles');
  const sneakers = byCategory('Sneakers');
  const beauty = byCategory('Beauté');

  const compositions: Composition[] = [];
  const usedSlugs = new Set<string>();

  const pickUnused = (arr: typeof withImages) => {
    const available = arr.filter((p) => !usedSlugs.has(p.slug));
    const p = pick(available);
    if (p) usedSlugs.add(p.slug);
    return p;
  };

  // Composition 1: Main + Parfum (or bag fallback)
  const companion1 = pickUnused(parfums) || pickUnused(bags);
  if (companion1) {
    compositions.push({
      id: `comp-${mainProduct!.slug}-1`,
      name: 'Rouge & Sole',
      styleTag: 'Evening ritual',
      products: [mainCP, toCompProduct(companion1)],
    });
  }

  // Composition 2: Main + Lip + Nail
  const lip = pickUnused(levres);
  const nail = pickUnused(ongles);
  if (lip) {
    const prods = [mainCP, toCompProduct(lip)];
    if (nail) prods.push(toCompProduct(nail));
    compositions.push({
      id: `comp-${mainProduct!.slug}-2`,
      name: 'Le Cabinet de Beauté',
      styleTag: 'Beauty edit',
      products: prods,
    });
  }

  // Composition 3: Main + Bag (or sneaker)
  const bag = pickUnused(bags) || pickUnused(sneakers);
  if (bag) {
    compositions.push({
      id: `comp-${mainProduct!.slug}-3`,
      name: 'Promenade Parisienne',
      styleTag: 'Day to night',
      products: [mainCP, toCompProduct(bag)],
    });
  }

  // Composition 4: Main + Beauty item + Escarpin
  const beautyItem = pickUnused(beauty) || pickUnused(parfums);
  const shoe = pickUnused(escarpins);
  if (beautyItem) {
    const prods = [mainCP, toCompProduct(beautyItem)];
    if (shoe) prods.push(toCompProduct(shoe));
    compositions.push({
      id: `comp-${mainProduct!.slug}-4`,
      name: "L'Atelier Rouge",
      styleTag: 'The full world',
      products: prods,
    });
  }

  return compositions;
}

// ── Preload cached images from storage ───────────────────────

async function preloadCachedImages(compositions: Composition[]): Promise<Composition[]> {
  if (compositions.length === 0) return compositions;

  const { data: files } = await supabase.storage
    .from('look-images')
    .list('compositions');

  if (!files?.length) return compositions;

  const existingIds = new Set(files.map((f) => f.name.replace('.png', '')));

  return compositions.map((comp) => {
    if (existingIds.has(comp.id)) {
      const { data } = supabase.storage.from('look-images').getPublicUrl(`compositions/${comp.id}.png`);
      return { ...comp, generatedImage: data.publicUrl + `?t=${Date.now()}` };
    }
    return comp;
  });
}

// ── Component ────────────────────────────────────────────────

const AtelierCompositions = ({ currentProduct }: AtelierCompositionsProps) => {
  const { settings } = usePlatformSettingsContext();
  const brandName = settings.brand_name || 'Studio';
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const generatedRef = useRef(new Set<string>());

  // Swipe-to-dismiss for composition sheet
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetStartY = useRef(0);

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const el = sheetScrollRef.current;
    if (el && el.scrollTop > 5) return;
    sheetStartY.current = e.touches[0].clientY;
    setSheetDragging(true);
  }, []);

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (!sheetDragging) return;
    const el = sheetScrollRef.current;
    if (el && el.scrollTop > 5) { setSheetDragging(false); setSheetDragY(0); return; }
    const dy = e.touches[0].clientY - sheetStartY.current;
    if (dy > 0) setSheetDragY(dy);
  }, [sheetDragging]);

  const handleSheetTouchEnd = useCallback(() => {
    if (!sheetDragging) return;
    if (sheetDragY > 80) setExpandedId(null);
    setSheetDragY(0);
    setSheetDragging(false);
  }, [sheetDragging, sheetDragY]);

  // Reset drag state when sheet closes
  useEffect(() => {
    if (!expandedId) { setSheetDragY(0); setSheetDragging(false); }
  }, [expandedId]);

  // Build compositions from DB on mount, including main product
  useEffect(() => {
    if (!currentProduct) {
      setInitialLoading(false);
      return;
    }

    buildCompositions(currentProduct).then(async (comps) => {
      const withCached = await preloadCachedImages(comps);
      setCompositions(withCached);
      setInitialLoading(false);
    });
  }, [currentProduct?.slug]);

  // Auto-generate compositions that don't have cached images
  useEffect(() => {
    if (initialLoading || compositions.length === 0) return;
    compositions.forEach((comp) => {
      if (!comp.generatedImage && !comp.loading && !generatedRef.current.has(comp.id)) {
        generatedRef.current.add(comp.id);
        generateComposition(comp.id);
      }
    });
  }, [initialLoading, compositions.length]);

  const generateComposition = useCallback(async (compId: string) => {
    setCompositions((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, loading: true } : c))
    );

    const comp = compositions.find((c) => c.id === compId);
    if (!comp) return;

    const productsWithImages = comp.products.filter((p) => p.image);
    if (productsWithImages.length < 2) {
      setCompositions((prev) =>
        prev.map((c) => (c.id === compId ? { ...c, loading: false } : c))
      );
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-composition', {
        body: {
          compositionId: compId,
          productImages: productsWithImages.map((p) => ({ url: p.image!, name: p.name })),
          compositionName: comp.name,
          styleTag: comp.styleTag,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCompositions((prev) =>
        prev.map((c) =>
          c.id === compId ? { ...c, generatedImage: data.imageUrl, loading: false } : c
        )
      );
    } catch (e: any) {
      console.warn(`Composition ${compId} generation skipped:`, e?.message);
      setCompositions((prev) =>
        prev.map((c) => (c.id === compId ? { ...c, loading: false } : c))
      );
    }
  }, [compositions]);

  const regenerate = useCallback(async (compId: string) => {
    await supabase.storage.from('look-images').remove([`compositions/${compId}.png`]);
    generatedRef.current.delete(compId);
    setCompositions((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, generatedImage: undefined } : c))
    );
    generateComposition(compId);
  }, [generateComposition]);

  const expanded = compositions.find((c) => c.id === expandedId) ?? null;

  if (initialLoading) return null;
  if (compositions.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#1A1A1A]" />
          <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-[#1A1A1A] text-white">
            AI
          </span>
        </div>
        <h2
          className="text-xl sm:text-2xl font-light mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1a1a1a' }}
        >
          Atelier Compositions
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-6">
          Curated pairings featuring this product · tap to explore
        </p>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {compositions.map((comp) => (
            <div key={comp.id} className="text-left group">
              <div
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#faf6f0' }}
                onClick={() => setExpandedId(comp.id)}
              >
                <span className="absolute top-2 left-2 z-10 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 backdrop-blur text-[#1a1a1a]">
                  Featured
                </span>

                {comp.generatedImage ? (
                  <img
                    src={comp.generatedImage}
                    alt={comp.name}
                    className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                ) : comp.loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#1A1A1A]" />
                    <span className="text-[10px] text-muted-foreground">Composing…</span>
                    <div className="flex items-end justify-center gap-1 mt-2">
                      {comp.products.slice(0, 3).map((p, i) => (
                        <div
                          key={i}
                          className="rounded overflow-hidden bg-white shadow-sm w-12 h-16"
                          style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
                        >
                          {p.image && (
                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                    <div className="flex items-end justify-center gap-1">
                      {comp.products.slice(0, 3).map((p, i) => (
                        <div
                          key={i}
                          className="rounded overflow-hidden bg-white shadow-sm w-14 h-20"
                          style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
                        >
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[7px] text-muted-foreground p-1 text-center">
                              {p.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {comp.products.map((p, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setExpandedId(comp.id); setQuickViewProduct(p); }}
                      className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full border border-[#e8e0d8] bg-white text-[#1a1a1a] truncate max-w-[120px] cursor-pointer hover:bg-[#f5f0eb] transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <p
                  className="text-xs sm:text-sm font-medium truncate"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1a1a1a' }}
                >
                  {comp.name}
                </p>
                <p className="text-[10px] text-muted-foreground italic">{comp.styleTag}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-[#C4A265] flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI Composed
                  </p>
                  {comp.generatedImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerate(comp.id); }}
                      className="text-[9px] text-muted-foreground hover:text-[#1A1A1A] flex items-center gap-0.5 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composition detail bottom-sheet */}
      {expanded && (
        <div
          className="fixed inset-0 z-50"
          style={{ pointerEvents: expanded ? 'auto' : 'none' }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setExpandedId(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <div
            ref={sheetScrollRef}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            style={{
              position: 'fixed', bottom: 0, left: '50%',
              transform: `translate(-50%, ${sheetDragY}px)`,
              width: 'min(440px, 100%)', zIndex: 51,
              background: '#FAF8F5',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
              maxHeight: '90dvh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              transition: sheetDragging ? 'none' : 'transform 350ms cubic-bezier(.16,1,.3,1)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', position: 'sticky', top: 0, zIndex: 10, background: '#FAF8F5', borderRadius: '16px 16px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D4CFC5' }} />
            </div>

            {/* Composition image */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#FFFFFF' }}>
              {expanded.generatedImage ? (
                <img
                  src={expanded.generatedImage}
                  alt={expanded.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C9A96E' }} />
                </div>
              )}
              <button
                onClick={() => setExpandedId(null)}
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#1A1A1A' }} />
              </button>
            </div>

            {/* Composition metadata */}
            <div style={{ padding: '20px 20px 0' }}>
              {/* AI Composed eyebrow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles style={{ width: 12, height: 12, color: '#C9A96E', fill: '#C9A96E' }} />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#C9A96E' }}>
                  AI Composed
                </span>
              </div>

              {/* Title */}
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 27, fontWeight: 400, color: '#1A1A1A', letterSpacing: '-0.01em', lineHeight: 1.1, margin: 0 }}>
                {expanded.name}
              </h3>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: '#8A8178', margin: '4px 0 24px' }}>
                {expanded.styleTag}
              </p>

              {/* Section label */}
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#8A8178', margin: '0 0 12px' }}>
                {expanded.products.length} product{expanded.products.length !== 1 ? 's' : ''} in this composition
              </p>

              {/* Product rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 32 }}>
                {expanded.products.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (p.slug) {
                        // Fetch full product for ProductPreviewSheet
                        supabase.from('products')
                          .select('id, product_code, name, price, images, slug, color, category, source_url, description, shopify_handle')
                          .eq('slug', p.slug)
                          .single()
                          .then(({ data }) => {
                            if (data) {
                              setQuickViewProduct({
                                id: data.id,
                                product_code: data.product_code || '',
                                name: data.name,
                                price: data.price,
                                images: normalizeImages(data.images),
                                slug: data.slug,
                                color: data.color,
                                category: data.category,
                                source_url: data.source_url,
                              });
                            }
                          });
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: 12, background: '#FFFFFF',
                      border: '0.5px solid rgba(201,169,110,0.12)',
                      borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left' as const,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(44,31,23,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 72, height: 72, flexShrink: 0,
                      background: '#F5F1EA', borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 6, overflow: 'hidden',
                    }}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} referrerPolicy="no-referrer" />
                      ) : (
                        <span style={{ fontSize: 10, color: '#8A8178' }}>No image</span>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.2, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {p.name}
                      </h4>
                      <p style={{ fontSize: 11, color: '#8A8178', margin: '0 0 6px' }}>
                        {brandName}
                      </p>
                      {p.price && (
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
                          {p.price}
                        </span>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight style={{ width: 18, height: 18, color: '#C9A96E', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product quick-view using shared ProductPreviewSheet */}
      <ProductPreviewSheet
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  );
};

export default AtelierCompositions;
