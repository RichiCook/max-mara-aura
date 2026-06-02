import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseImages, getFlatLayImage, filterImagesBySku } from '@/utils/imageUtils';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { ChevronRight, Sparkles } from 'lucide-react';

interface LookProduct {
  id: string;
  name: string;
  price: string | null;
  product_code: string | null;
  short_code: string | null;
  slug: string;
  images: string[];
  category: string | null;
}

export default function LookSharePage() {
  const [params] = useSearchParams();
  const { settings } = usePlatformSettingsContext();
  const name = params.get('name') || 'A curated look';
  const desc = params.get('desc') || '';
  const img = params.get('img');
  const codes = useMemo(() => (params.get('codes') || '').split(',').map(s => s.trim()).filter(Boolean), [params]);

  const [products, setProducts] = useState<LookProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${name} · Look`;
    const meta = (name: string, content: string) => {
      let el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    meta('og:title', name);
    meta('og:type', 'website');
    if (img) meta('og:image', img);
    if (desc) meta('og:description', desc);
  }, [name, desc, img]);

  useEffect(() => {
    if (codes.length === 0) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name,price,product_code,short_code,slug,images,category')
        .in('product_code', codes);
      const mapped: LookProduct[] = (data || []).map(p => ({
        ...p,
        images: parseImages(p.images),
      }));
      // Preserve order from `codes`
      mapped.sort((a, b) => codes.indexOf(a.product_code || '') - codes.indexOf(b.product_code || ''));
      setProducts(mapped);
      setLoading(false);
    })();
  }, [codes]);

  return (
    <div className="min-h-screen" style={{ background: '#FAF8F5' }}>
      <header className="border-b sticky top-0 z-10" style={{ borderColor: '#e4e0db', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.brand_name || 'Logo'} className="h-7 w-auto object-contain" />
            ) : (
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                {settings.brand_name || 'Studio'}
              </span>
            )}
          </Link>
          <Link
            to="/auth"
            className="text-xs"
            style={{ fontFamily: "'Inter', sans-serif", color: '#8b7355', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}
          >
            Save this look
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <section className="pt-6 pb-4 text-center">
          <div className="inline-flex items-center gap-1.5 mb-2" style={{ color: '#8b7355' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>
              AI-Curated Look
            </span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {name}
          </h1>
          {desc && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#6b6258', margin: '8px auto 0', maxWidth: 480 }}>
              {desc}
            </p>
          )}
        </section>

        {img && (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e4e0db', background: '#fff', marginBottom: 24 }}>
            <img src={img} alt={name} style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#8b7355', letterSpacing: '0.18em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
          Shop the look
        </h2>

        {loading ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#b5ada5' }}>Loading products…</p>
        ) : products.length === 0 ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#b5ada5' }}>No matching products available.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
            {products.map((p) => {
              const thumb = getFlatLayImage(filterImagesBySku(p.images, p.product_code), p.category) || p.images[0];
              const href = p.short_code ? `/p/${p.short_code}` : `/product/${p.slug}`;
              return (
                <li key={p.id}>
                  <Link
                    to={href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                      background: '#fff', border: '1px solid #e4e0db', borderRadius: 10,
                      textDecoration: 'none', color: '#1a1a1a',
                    }}
                  >
                    <div style={{ width: 64, height: 64, background: '#f7f3ee', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      {thumb && <img src={thumb} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {p.name}
                      </p>
                      {p.price && (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8b7355', margin: '2px 0 0' }}>{p.price}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: '#c5c0ba' }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
