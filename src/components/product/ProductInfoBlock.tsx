import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import RepairRequestSheet from '@/components/repair/RepairRequestSheet';
import { RepairSettings, DEFAULT_REPAIR_SETTINGS } from '@/hooks/useRepairSettings';

interface ProductInfoBlockProps {
  price?: string | null;
  productCode?: string | null;
  description?: string | null;
  composition?: string | null;
  sourceUrl?: string | null;
  productName?: string;
  productId?: string;
}

const PALETTES: Record<string, string[]> = {
  'warm-naturals': ['#8c7b6b', '#b8a99a', '#d4c8bb', '#ede7e0'],
};

const parseComposition = (comp: string): { name: string; pct: number }[] => {
  const parts: { name: string; pct: number }[] = [];
  const regex = /(\d+)\s*%\s*([A-Za-zÀ-ÿ\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(comp)) !== null) {
    parts.push({ pct: parseInt(m[1]), name: m[2].trim() });
  }
  if (parts.length === 0 && comp) {
    return [{ pct: 100, name: comp }];
  }
  return parts.sort((a, b) => b.pct - a.pct);
};

const ProductInfoBlock = ({ price, productCode, description, composition, sourceUrl, productName, productId }: ProductInfoBlockProps) => {
  const palette = PALETTES['warm-naturals'];
  const compParts = composition ? parseComposition(composition) : [];
  const [repairSettings, setRepairSettings] = useState<RepairSettings | null>(null);
  const [repairOpen, setRepairOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'repair_service')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          const s = { ...DEFAULT_REPAIR_SETTINGS, ...(data.value as any) };
          if (s.enabled) setRepairSettings(s);
        }
      });
  }, []);

  return (
    <div className="px-4">
      {/* Price row */}
      <div className="flex items-baseline justify-between pt-4">
        <div className="flex items-baseline gap-2">
          {price && (
            <>
              <span className="font-sans text-[26px] font-bold text-foreground">{price.replace(/a partir de\s*/i, '')}</span>
            </>
          )}
        </div>
        {productCode && (
          <span className="font-sans text-[11px] text-muted-foreground">{productCode}</span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="font-sans text-[14px] leading-7 text-muted-foreground pt-3.5">
          {description}
        </p>
      )}

      {/* Composition */}
      {compParts.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
              Composition
            </span>
            <div className="flex items-center gap-1">
              {palette.map((c, i) => (
                <span key={i} className="inline-block w-2 h-2 rounded-sm" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex overflow-hidden rounded mt-2.5" style={{ height: 7 }}>
            {compParts.map((part, i) => (
              <div key={i} style={{ width: `${part.pct}%`, background: palette[i % palette.length], height: '100%' }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
            {compParts.map((part, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: palette[i % palette.length] }} />
                <span className="font-sans text-[12px] text-muted-foreground">
                  {part.pct}% {part.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repair Button */}
      {repairSettings && (
        <>
          <div className="my-6" style={{ height: 1, background: 'linear-gradient(90deg, transparent, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent)' }} />
          <button
            onClick={() => setRepairOpen(true)}
            className="flex items-center w-full p-4 rounded-lg border border-border bg-card cursor-pointer gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
            <div className="flex-1 text-left min-w-0">
              <span className="font-sans text-[13px] font-semibold text-foreground block">Request a Repair</span>
              <span className="font-sans text-[11px] text-muted-foreground">Ship to us · Photo assessment included</span>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
              <path d="M1 1l6 6-6 6" />
            </svg>
          </button>
        </>
      )}

      {/* Divider */}
      <div className="my-6" style={{ height: 1, background: 'linear-gradient(90deg, transparent, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent)' }} />

      {/* CTA */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg font-sans text-[15px] font-semibold py-4 no-underline text-center"
          style={{ background: '#E12B38', color: '#fff' }}
        >
          View on our Store
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M5 11L11 5M11 5H6M11 5V10" />
          </svg>
        </a>
      )}

      {/* Footer */}
      <p className="font-sans text-[11px] text-muted-foreground text-center mt-3">
        Powered by Aitems · Product Intelligence
      </p>

      {/* Repair Sheet */}
      {repairSettings && (
        <RepairRequestSheet
          open={repairOpen}
          onClose={() => setRepairOpen(false)}
          productName={productName || 'Product'}
          productCode={productCode}
          productId={productId}
          repairSettings={repairSettings}
        />
      )}
    </div>
  );
};

export default ProductInfoBlock;
