/**
 * Atelier Compositions — "Interactive still life illustrations in Louboutin's ink sketch style"
 *
 * FUTURE: This section will pull from a `product_connections` table in the backend
 * where admins define which products are paired together, and the AI generates
 * compositions from those connections. For now, the pairings are hardcoded for demo.
 */

import { useState } from 'react';
import { Sparkles, X, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// ── Demo data ────────────────────────────────────────────────

interface CompositionProduct {
  name: string;
  price: string;
  image?: string;
  slug?: string;
  /** Hotspot position within the sketch (percentage based) */
  hotspot: { x: number; y: number; w: number; h: number };
}

interface Composition {
  id: string;
  name: string;
  styleTag: string;
  products: CompositionProduct[];
}

const DEMO_COMPOSITIONS: Composition[] = [
  {
    id: 'rouge-sole',
    name: 'Rouge & Sole',
    styleTag: 'Evening ritual',
    products: [
      { name: 'So Kate 120mm', price: '€695', hotspot: { x: 15, y: 30, w: 40, h: 55 } },
      { name: 'Rouge Louboutin Eau de Parfum', price: '€290', hotspot: { x: 55, y: 15, w: 35, h: 50 } },
    ],
  },
  {
    id: 'cabinet-beaute',
    name: 'Le Cabinet de Beauté',
    styleTag: 'Beauty edit',
    products: [
      { name: 'So Kate 120mm', price: '€695', hotspot: { x: 10, y: 25, w: 35, h: 60 } },
      { name: 'Beauté Lipstick', price: '€90', hotspot: { x: 50, y: 10, w: 20, h: 40 } },
      { name: 'Nail Colour', price: '€50', hotspot: { x: 65, y: 45, w: 25, h: 40 } },
    ],
  },
  {
    id: 'promenade',
    name: 'Promenade Parisienne',
    styleTag: 'Day to night',
    products: [
      { name: 'So Kate 120mm', price: '€695', hotspot: { x: 10, y: 30, w: 40, h: 55 } },
      { name: 'Paloma Clutch', price: '€1,290', hotspot: { x: 50, y: 15, w: 40, h: 50 } },
    ],
  },
  {
    id: 'atelier-rouge',
    name: "L'Atelier Rouge",
    styleTag: 'The full world',
    products: [
      { name: 'So Kate 120mm', price: '€695', hotspot: { x: 5, y: 35, w: 30, h: 55 } },
      { name: 'Loubifunk Sneaker', price: '€895', hotspot: { x: 35, y: 20, w: 30, h: 50 } },
      { name: 'Rouge Louboutin Fragrance', price: '€290', hotspot: { x: 65, y: 15, w: 30, h: 45 } },
    ],
  },
];

// ── SVG sketches per composition ─────────────────────────────

const SketchRouge = () => (
  <svg viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Shoe silhouette */}
    <path d="M60 320 C60 300, 80 240, 120 200 C140 180, 160 175, 170 180 C185 185, 190 200, 180 220 L170 260 C165 280, 155 310, 140 330 L60 330 Z"
      stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Red sole */}
    <path d="M60 325 C80 332, 120 335, 140 328" stroke="#E12B38" strokeWidth="2.5" strokeLinecap="round" />
    {/* Heel */}
    <path d="M165 195 C175 170, 178 140, 175 120" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Perfume bottle */}
    <rect x="200" y="100" width="50" height="120" rx="4" stroke="#1a1a1a" strokeWidth="1.2" />
    <rect x="215" y="80" width="20" height="25" rx="2" stroke="#1a1a1a" strokeWidth="1" />
    <circle cx="225" cy="68" r="8" stroke="#C4A265" strokeWidth="1" />
    <rect x="210" y="140" width="30" height="20" rx="1" fill="#E12B38" opacity="0.15" stroke="#E12B38" strokeWidth="0.5" />
    {/* Decorative lines */}
    <line x1="40" y1="350" x2="270" y2="350" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3" />
    <circle cx="155" cy="370" r="2" fill="#E12B38" opacity="0.4" />
  </svg>
);

const SketchBeaute = () => (
  <svg viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Shoe */}
    <path d="M30 300 C30 280, 50 220, 90 180 C110 160, 130 155, 140 160 C155 165, 158 180, 148 200 L138 240 C133 260, 123 290, 108 310 L30 310 Z"
      stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M30 305 C50 312, 90 315, 108 308" stroke="#E12B38" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M135 175 C145 150, 148 120, 145 100" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lipstick */}
    <rect x="175" y="60" width="22" height="80" rx="3" stroke="#1a1a1a" strokeWidth="1.2" />
    <path d="M175 60 L186 40 L197 60" stroke="#E12B38" strokeWidth="1.5" fill="#E12B38" opacity="0.3" />
    <rect x="175" y="110" width="22" height="30" rx="2" stroke="#1a1a1a" strokeWidth="1" />
    {/* Nail polish */}
    <path d="M230 210 C230 195, 235 185, 245 180 C255 185, 260 195, 260 210 L260 290 C260 295, 255 300, 245 300 C235 300, 230 295, 230 290 Z"
      stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
    <rect x="238" y="165" width="14" height="20" rx="2" stroke="#1a1a1a" strokeWidth="1" />
    <ellipse cx="245" cy="250" rx="10" ry="15" fill="#E12B38" opacity="0.12" />
    {/* Surface line */}
    <line x1="20" y1="330" x2="275" y2="330" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

const SketchPromenade = () => (
  <svg viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Shoe */}
    <path d="M40 310 C40 290, 60 230, 100 190 C120 170, 140 165, 150 170 C165 175, 168 190, 158 210 L148 250 C143 270, 133 300, 118 320 L40 320 Z"
      stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M40 315 C60 322, 100 325, 118 318" stroke="#E12B38" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M145 185 C155 160, 158 130, 155 110" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
    {/* Clutch bag */}
    <path d="M180 100 L270 100 C275 100, 280 105, 280 110 L280 200 C280 205, 275 210, 270 210 L180 210 C175 210, 170 205, 170 200 L170 110 C170 105, 175 100, 180 100 Z"
      stroke="#1a1a1a" strokeWidth="1.3" fill="none" />
    <path d="M170 140 L280 140" stroke="#1a1a1a" strokeWidth="1" />
    <circle cx="225" cy="138" r="5" stroke="#C4A265" strokeWidth="1.2" fill="none" />
    <path d="M200 100 C200 80, 250 80, 250 100" stroke="#1a1a1a" strokeWidth="1" fill="none" />
    {/* CL monogram hint */}
    <text x="215" y="180" fontFamily="'Playfair Display', serif" fontSize="14" fill="#1a1a1a" opacity="0.15">CL</text>
    <line x1="30" y1="340" x2="285" y2="340" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3" />
  </svg>
);

const SketchAtelier = () => (
  <svg viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* So Kate - left */}
    <path d="M20 310 C20 290, 35 240, 65 205 C80 190, 95 185, 102 190 C112 195, 115 208, 107 225 L100 255 C96 272, 88 300, 76 315 L20 315 Z"
      stroke="#1a1a1a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d="M20 312 C35 318, 65 320, 76 314" stroke="#E12B38" strokeWidth="2" strokeLinecap="round" />
    <path d="M100 200 C108 178, 110 152, 108 135" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round" />
    {/* Sneaker - center */}
    <path d="M115 260 C115 250, 120 235, 135 225 C145 220, 165 218, 180 225 C190 230, 195 245, 195 260 L195 285 C195 290, 190 295, 185 295 L125 295 C120 295, 115 290, 115 285 Z"
      stroke="#1a1a1a" strokeWidth="1.3" fill="none" />
    <path d="M120 270 L190 270" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5" />
    <path d="M115 285 L195 285" stroke="#E12B38" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="140" cy="245" r="3" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
    <circle cx="155" cy="240" r="3" stroke="#1a1a1a" strokeWidth="0.8" fill="none" />
    {/* Perfume - right */}
    <rect x="220" y="120" width="40" height="100" rx="3" stroke="#1a1a1a" strokeWidth="1.2" />
    <rect x="232" y="102" width="16" height="22" rx="2" stroke="#1a1a1a" strokeWidth="1" />
    <circle cx="240" cy="92" r="6" stroke="#C4A265" strokeWidth="1" />
    <rect x="228" y="155" width="24" height="16" rx="1" fill="#E12B38" opacity="0.12" stroke="#E12B38" strokeWidth="0.5" />
    {/* Surface */}
    <line x1="10" y1="330" x2="285" y2="330" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3" />
    <circle cx="150" cy="355" r="2" fill="#E12B38" opacity="0.3" />
  </svg>
);

const SKETCH_MAP: Record<string, React.FC> = {
  'rouge-sole': SketchRouge,
  'cabinet-beaute': SketchBeaute,
  'promenade': SketchPromenade,
  'atelier-rouge': SketchAtelier,
};

// ── Component ────────────────────────────────────────────────

const AtelierCompositions = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<CompositionProduct | null>(null);

  const expanded = DEMO_COMPOSITIONS.find(c => c.id === expandedId) ?? null;

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
          {DEMO_COMPOSITIONS.map((comp) => {
            const Sketch = SKETCH_MAP[comp.id];
            return (
              <button
                key={comp.id}
                onClick={() => setExpandedId(comp.id)}
                className="text-left group focus:outline-none"
              >
                {/* Illustration area */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden" style={{ backgroundColor: '#faf6f0' }}>
                  {/* Featured badge */}
                  <span className="absolute top-2 left-2 z-10 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/80 backdrop-blur text-[#1a1a1a]">
                    Featured
                  </span>
                  {/* Sketch */}
                  <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                    {Sketch && <Sketch />}
                  </div>
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
                  <p className="text-[9px] text-[#C4A265] flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI Composed
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded composition modal overlay */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setExpandedId(null)}>
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={() => setExpandedId(null)} className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-white transition">
              <X className="w-4 h-4 text-[#1a1a1a]" />
            </button>

            {/* Sketch with hotspots */}
            <div className="relative aspect-[3/4] w-full" style={{ backgroundColor: '#faf6f0' }}>
              <div className="absolute inset-0 p-8 flex items-center justify-center">
                {SKETCH_MAP[expanded.id] && (() => { const S = SKETCH_MAP[expanded.id]; return <S />; })()}
              </div>
              {/* Interactive hotspots */}
              {expanded.products.map((product, i) => (
                <button
                  key={i}
                  onClick={() => setQuickViewProduct(product)}
                  className="absolute rounded-full border-2 border-[#E12B38]/40 bg-[#E12B38]/5 hover:bg-[#E12B38]/15 hover:border-[#E12B38]/70 transition-all cursor-pointer group/hotspot"
                  style={{
                    left: `${product.hotspot.x}%`,
                    top: `${product.hotspot.y}%`,
                    width: `${product.hotspot.w}%`,
                    height: `${product.hotspot.h}%`,
                  }}
                  title={product.name}
                >
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow opacity-0 group-hover/hotspot:opacity-100 transition-opacity text-[#1a1a1a]">
                    {product.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Info bar */}
            <div className="px-5 py-4">
              <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>{expanded.name}</h3>
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
                <SheetTitle style={{ fontFamily: "'Playfair Display', serif" }}>{quickViewProduct.name}</SheetTitle>
              </SheetHeader>

              {/* Placeholder product image */}
              <div className="aspect-square rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#faf6f0' }}>
                <svg viewBox="0 0 120 120" className="w-24 h-24 opacity-30">
                  <rect x="20" y="20" width="80" height="80" rx="8" stroke="#1a1a1a" strokeWidth="1" fill="none" />
                  <path d="M40 80 L60 50 L80 80" stroke="#1a1a1a" strokeWidth="1" fill="none" />
                  <circle cx="75" cy="40" r="6" stroke="#1a1a1a" strokeWidth="1" fill="none" />
                </svg>
              </div>

              <p className="text-lg font-semibold text-[#1a1a1a] mb-1">{quickViewProduct.price}</p>
              <p className="text-xs text-muted-foreground mb-5">Christian Louboutin</p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2">
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
