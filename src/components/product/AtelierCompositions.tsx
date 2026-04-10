/**
 * Atelier Compositions — AI-composed still-life images using real product photos.
 *
 * FUTURE: Pull pairings from a `product_connections` table where admins define
 * which products go together. For now, compositions are built dynamically
 * from products in the database by category.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, X, ExternalLink, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
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

// ── Build compositions from real DB products ─────────────────

async function buildCompositionsFromDB(): Promise<Composition[]> {
  // Fetch products from different categories to create interesting pairings
  const { data: allProducts, error } = await supabase
    .from('products')
    .select('name, slug, price, images, category')
    .not('images', 'is', null)
    .limit(500);

  if (error || !allProducts?.length) return [];

  // Parse products with images
  const withImages = allProducts
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      price: p.price || '',
      image: normalizeImages(p.images)[0] || '',
      category: p.category || '',
    }))
    .filter((p) => p.image);

  // Find products by category
  const escarpins = withImages.filter((p) => p.category.includes('Escarpins'));
  const bags = withImages.filter((p) => p.category.includes('Sacs'));
  const beauty = withImages.filter((p) => p.category.includes('Beauté'));
  const parfums = withImages.filter((p) => p.category.includes('Parfums'));
  const sneakers = withImages.filter((p) => p.category.includes('Sneakers'));
  const levres = withImages.filter((p) => p.category.includes('Lèvres'));
  const ongles = withImages.filter((p) => p.category.includes('Ongles'));

  const pick = (arr: typeof withImages) => arr[Math.floor(Math.random() * arr.length)];

  const toProduct = (p: typeof withImages[0]): CompositionProduct => ({
    name: p.name,
    price: p.price,
    image: p.image,
    slug: p.slug,
  });

  const compositions: Composition[] = [];

  // Composition 1: Escarpin + Parfum
  const shoe1 = pick(escarpins);
  const parfum1 = pick(parfums);
  if (shoe1 && parfum1) {
    compositions.push({
      id: 'rouge-sole',
      name: 'Rouge & Sole',
      styleTag: 'Evening ritual',
      products: [toProduct(shoe1), toProduct(parfum1)],
    });
  }

  // Composition 2: Escarpin + Lipstick + Nail
  const shoe2 = pick(escarpins.filter((s) => s.slug !== shoe1?.slug));
  const lip = pick(levres);
  const nail = pick(ongles);
  if (shoe2 && lip) {
    const prods = [toProduct(shoe2), toProduct(lip)];
    if (nail) prods.push(toProduct(nail));
    compositions.push({
      id: 'cabinet-beaute',
      name: 'Le Cabinet de Beauté',
      styleTag: 'Beauty edit',
      products: prods,
    });
  }

  // Composition 3: Escarpin + Bag
  const shoe3 = pick(escarpins.filter((s) => s.slug !== shoe1?.slug && s.slug !== shoe2?.slug));
  const bag = pick(bags);
  if (shoe3 && bag) {
    compositions.push({
      id: 'promenade',
      name: 'Promenade Parisienne',
      styleTag: 'Day to night',
      products: [toProduct(shoe3), toProduct(bag)],
    });
  }

  // Composition 4: Sneaker + Beauty + Parfum
  const snkr = pick(sneakers);
  const beauty1 = pick(beauty.filter((b) => b.slug !== lip?.slug && b.slug !== nail?.slug));
  if (snkr && beauty1) {
    compositions.push({
      id: 'atelier-rouge',
      name: "L'Atelier Rouge",
      styleTag: 'The full world',
      products: [toProduct(snkr), toProduct(beauty1)],
    });
  }

  return compositions;
}

// ── Component ────────────────────────────────────────────────

const AtelierCompositions = () => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<CompositionProduct | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const generatedRef = useRef(new Set<string>());

  // Build compositions from DB on mount
  useEffect(() => {
    buildCompositionsFromDB().then((comps) => {
      setCompositions(comps);
      setInitialLoading(false);
    });
  }, []);

  // Auto-generate compositions once products are loaded
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

    // Get the current composition data
    const comp = compositions.find((c) => c.id === compId) ||
      (await buildCompositionsFromDB()).find((c) => c.id === compId);

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
      console.error(`Composition ${compId} error:`, e);
      setCompositions((prev) =>
        prev.map((c) => (c.id === compId ? { ...c, loading: false } : c))
      );
      toast.error(`Failed to generate "${comp.name}"`);
    }
  }, [compositions]);

  const regenerate = useCallback(async (compId: string) => {
    // Delete existing from storage first
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
          {compositions.map((comp) => (
            <div key={comp.id} className="text-left group">
              <div
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                style={{ backgroundColor: '#faf6f0' }}
                onClick={() => comp.generatedImage && setExpandedId(comp.id)}
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
                    <Loader2 className="w-6 h-6 animate-spin text-[#E12B38]" />
                    <span className="text-[10px] text-muted-foreground">Composing…</span>
                    {/* Show product thumbnails while generating */}
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
                  {comp.generatedImage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); regenerate(comp.id); }}
                      className="text-[9px] text-muted-foreground hover:text-[#E12B38] flex items-center gap-0.5 transition-colors"
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

      {/* Expanded modal */}
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

            {expanded.generatedImage && (
              <div className="relative aspect-square w-full bg-[#faf6f0]">
                <img
                  src={expanded.generatedImage}
                  alt={expanded.name}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            )}

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

      {/* Quick-view drawer */}
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
                  <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <span className="text-muted-foreground text-sm">No image</span>
                )}
              </div>

              <p className="text-lg font-semibold text-[#1a1a1a] mb-1">{quickViewProduct.price}</p>
              <p className="text-xs text-muted-foreground mb-5">Christian Louboutin</p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => quickViewProduct.slug && (window.location.href = `/product/${quickViewProduct.slug}`)}
                  disabled={!quickViewProduct.slug}
                >
                  <ExternalLink className="w-4 h-4" /> View Product
                </Button>
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
