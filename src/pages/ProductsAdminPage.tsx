import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

export const firstImage = (p: { approved_lay_flat_image_url?: string | null; cutout_url?: string | null; images?: unknown }) => {
  if (p.approved_lay_flat_image_url) return p.approved_lay_flat_image_url;
  const imgs = Array.isArray(p.images) ? (p.images as unknown[]) : [];
  const f = imgs[0] as string | { url?: string } | undefined;
  return (typeof f === 'string' ? f : f?.url) || p.cutout_url || '';
};

export default function ProductsAdminPage() {
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,product_code,price,category,images,approved_lay_flat_image_url,cutout_url')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter((p) => !s || p.name.toLowerCase().includes(s) || (p.product_code || '').toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">{data.length} imported products</p>
        </div>
        <Input placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {list.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition">
              <div className="aspect-square bg-muted">
                {firstImage(p) && <img src={firstImage(p)} alt={p.name} loading="lazy" className="w-full h-full object-contain" />}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.product_code} {p.price && `· ${p.price}`}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
