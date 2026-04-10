/**
 * Atelier Compositions — Real product photo still-life compositions
 *
 * FUTURE: This section will pull from a `product_connections` table in the backend
 * where admins define which products are paired together, and the AI generates
 * compositions from those connections. For now, the pairings are hardcoded for demo.
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X, ExternalLink, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, normalizeImages } from '@/hooks/useProducts';
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
  /** Product codes or slugs to look up in the DB */
  productRefs: { name: string; fallbackPrice: string }[];
  products: CompositionProduct[];
  generatedImage?: string;
}

// ── Demo composition definitions ─────────────────────────────

const COMPOSITION_DEFS: Omit<Composition, 'products' | 'generatedImage'>[] = [
  {
    id: 'rouge-sole',
    name: 'Rouge & Sole',
    styleTag: 'Evening ritual',
    productRefs: [
      { name: 'So Kate 120mm', fallbackPrice: '€695' },
      { name: 'Rouge Louboutin Eau de Parfum', fallbackPrice: '€290' },
    ],
  },
  {
    id: 'cabinet-beaute',
    name: 'Le Cabinet de Beauté',
    styleTag: 'Beauty edit',
    productRefs: [
      { name: 'So Kate 120mm', fallbackPrice: '€695' },
      { name: 'Beauté Lipstick', fallbackPrice: '€90' },
      { name: 'Nail Colour', fallbackPrice: '€50' },
    ],
  },
  {
    id: 'promenade',
    name: 'Promenade Parisienne',
    styleTag: 'Day to night',
    productRefs: [
      { name: 'So Kate 120mm', fallbackPrice: '€695' },
      { name: 'Paloma Clutch', fallbackPrice: '€1,290' },
    ],
  },
  {
    id: 'atelier-rouge',
    name: "L'Atelier Rouge",
    styleTag: 'The full world',
    productRefs: [
      { name: 'So Kate 120mm', fallbackPrice: '€695' },
      { name: 'Loubifunk Sneaker', fallbackPrice: '€895' },
      { name: 'Rouge Louboutin Fragrance', fallbackPrice: '€290' },
    ],
  },
];

// ── Component ────────────────────────────────────────────────

const AtelierCompositions = () => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<CompositionProduct | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const { products } = useProducts();

  // Match composition product refs to real DB products
  useEffect(() => {
    const built: Composition[] = COMPOSITION_DEFS.map((def) => {
      const matchedProducts: CompositionProduct[] = def.productRefs.map((ref) => {
        const dbProduct = products.find(
          (p) => p.name.toLowerCase().includes(ref.name.toLowerCase()) ||
                 ref.name.toLowerCase().includes(p.name.toLowerCase())
        );
        if (dbProduct) {
          const images = normalizeImages(dbProduct.images as unknown);
          return {
            name: dbProduct.name,
            price: dbProduct.price || ref.fallbackPrice,
            image: images[0] || undefined,
            slug: dbProduct.slug,
          };
        }
        return { name: ref.name, price: ref.fallbackPrice };
      });

      return { ...def, products: matchedProducts };
    });
    setCompositions(built);
  }, [products]);

  // Check for existing generated compositions on mount
  useEffect(() => {
    const checkExisting = async () => {
      const updated = [...compositions];
      let changed = false;
      for (const comp of updated) {
        const { data } = supabase.storage
          .from('look-images')
          .getPublicUrl(`compositions/${comp.id}.png`);
        
        // Check if the image exists by trying to fetch it
        try {
          const resp = await fetch(data.publicUrl, { method: 'HEAD' });
          if (resp.ok) {
            comp.generatedImage = data.publicUrl + `?t=${Date.now()}`;
            changed = true;
          }
        } catch { /* doesn't exist yet */ }
      }
      if (changed) setCompositions([...updated]);
    };
    if (compositions.length > 0) checkExisting();
  }, [compositions.length]);

  const generateComposition = useCallback(async (comp: Composition) => {
    // Need at least 2 products with images
    const productsWithImages = comp.products.filter((p) => p.image);
    if (productsWithImages.length < 2) {
      toast.error('Need at least 2 products with images to generate a composition');
      return;
    }

    setGeneratingIds((prev) => new Set(prev).add(comp.id));

    try {
      const { data, error } = await supabase.functions.invoke('generate-composition', {
        body: {
          compositionId: comp.id,
          productImages: productsWithImages.map((p) => ({ url: p.image!, name: p.name })),
          compositionName: comp.name,
          styleTag: comp.styleTag,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCompositions((prev) =>
        prev.map((c) =>
          c.id === comp.id ? { ...c, generatedImage: data.imageUrl + `?t=${Date.now()}` } : c
        )
      );
      toast.success(`"${comp.name}" composition generated!`);
    } catch (e: any) {
      console.error('Composition generation error:', e);
      toast.error(e.message || 'Failed to generate composition');
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(comp.id);
        return next;
      });
    }
  }, []);

  const expanded = compositions.find((c) => c.id === expandedId) ?? null;

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#E12B38]" />
          <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 bg-[#E12B38] text-white">
            AI
          </span>
        </div>
        <h2
          className="text-xl sm:text-2xl font-light mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: '#1a1a1a' }}
        >
          Atelier Compositions
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-6">
          Curated pairings · tap to explore
        </p>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {compositions.map((comp) => {
            const isGenerating = generatingIds.has(comp.id);
            const hasImage = !!comp.generatedImage;
            const hasProductImages = comp.products.some((p) => p.image);

            return (
              <div key={comp.id} className="text-left group">
                {/* Illustration / Generated image area */}
                <button
                  onClick={() => hasImage ? setExpandedId(comp.id) : undefined}
                  className="w-full focus:outline-none"
                  disabled={!hasImage}
                >
                  <div
                    className="relative aspect-[3/4] rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#faf6f0' }}
                  >
                    <span className="absolute top-2 left-2 z-10 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 backdrop-blur text-[#1a1a1a]">
                      Featured
                    </span>

                    {hasImage ? (
                      <img
                        src={comp.generatedImage}
                        alt={comp.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        {/* Show product thumbnails as preview */}
                        <div className="flex items-end justify-center gap-1">
                          {comp.products.slice(0, 3).map((p, i) => (
                            <div
                              key={i}
                              className="rounded overflow-hidden bg-white shadow-sm"
                              style={{
                                width: comp.products.length > 2 ? '60px' : '80px',
                                height: comp.products.length > 2 ? '80px' : '100px',
                                transform: `rotate(${(i - 1) * 5}deg)`,
                              }}
                            >
                              {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground text-center p-1">
                                  {p.name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {hasProductImages && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 gap-1 bg-white/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateComposition(comp);
                            }}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {isGenerating ? 'Composing…' : 'Generate'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {/* Meta */}
                <div className="mt-2 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {comp.products.map((p, i) => (
                      <span
                        key={i}
                        className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full border border-[#e8e0d8] bg-white text-[#1a1a1a] truncate max-w-[120px]"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <p
                    className="text-xs sm:text-sm font-medium truncate"
                    style={{ fontFamily: "'Playfair Display', serif", color: '#1a1a1a' }}
                  >
                    {comp.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground italic">{comp.styleTag}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-[#C4A265] flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI Composed
                    </p>
                    {hasImage && (
                      <button
                        onClick={() => generateComposition(comp)}
                        disabled={isGenerating}
                        className="text-[9px] text-muted-foreground hover:text-[#E12B38] flex items-center gap-0.5 transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded composition modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setExpandedId(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedId(null)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-white transition"
            >
              <X className="w-4 h-4 text-[#1a1a1a]" />
            </button>

            <div className="relative aspect-[3/4] w-full" style={{ backgroundColor: '#faf6f0' }}>
              {expanded.generatedImage ? (
                <img
                  src={expanded.generatedImage}
                  alt={expanded.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
            </div>

            {/* Info bar */}
            <div className="px-5 py-4">
              <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                {expanded.name}
              </h3>
              <p className="text-xs text-muted-foreground italic mb-3">{expanded.styleTag}</p>
              <div className="flex flex-wrap gap-1.5">
                {expanded.products.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setQuickViewProduct(p)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-[#e8e0d8] bg-[#faf6f0] hover:bg-[#f0e8dc] transition text-[#1a1a1a]"
                  >
                    {p.name} · {p.price}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#C4A265] flex items-center gap-1 mt-3">
                <Sparkles className="w-3 h-3" /> AI Composed · Tap products to explore
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick-view product drawer */}
      <Sheet open={!!quickViewProduct} onOpenChange={(open) => { if (!open) setQuickViewProduct(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          {quickViewProduct && (
            <>
              <SheetHeader className="text-left pb-3">
                <SheetTitle style={{ fontFamily: "'Playfair Display', serif" }}>
                  {quickViewProduct.name}
                </SheetTitle>
              </SheetHeader>

              <div className="aspect-square rounded-lg mb-4 flex items-center justify-center bg-white">
                {quickViewProduct.image ? (
                  <img
                    src={quickViewProduct.image}
                    alt={quickViewProduct.name}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground text-sm">
                    No image available
                  </div>
                )}
              </div>

              <p className="text-lg font-semibold text-[#1a1a1a] mb-1">{quickViewProduct.price}</p>
              <p className="text-xs text-muted-foreground mb-5">Christian Louboutin</p>

              <div className="flex gap-3">
                {quickViewProduct.slug ? (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      window.location.href = `/product/${quickViewProduct.slug}`;
                    }}
                  >
                    <ExternalLink className="w-4 h-4" /> View Product
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1 gap-2" disabled>
                    <ExternalLink className="w-4 h-4" /> View Product
                  </Button>
                )}
                <Button className="flex-1 gap-2 bg-[#E12B38] hover:bg-[#c72330] text-white">
                  <ShoppingBag className="w-4 h-4" /> Add to Bag
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default AtelierCompositions;
