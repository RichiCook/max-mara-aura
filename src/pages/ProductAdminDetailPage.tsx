import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const LABELS: Record<string, string> = {
  scan: 'Scans',
  page_view: 'Page views',
  look_product_click: 'Look clicks',
  look_regenerate: 'Look refreshes',
  lead_capture: 'Leads',
};

export default function ProductAdminDetailPage() {
  const { id } = useParams();
  const { data: product } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-product-stats', product?.product_code, id],
    enabled: !!product,
    queryFn: async () => {
      const code = product!.product_code;
      const [events, wish, ward, leads] = await Promise.all([
        code
          ? supabase.from('scan_events').select('event_type,session_id,created_at').eq('product_code', code).limit(5000)
          : Promise.resolve({ data: [] as { event_type: string; session_id: string; created_at: string }[] }),
        supabase.from('user_wishlist').select('id', { count: 'exact', head: true }).eq('product_id', id!),
        supabase.from('user_wardrobe').select('id', { count: 'exact', head: true }).eq('product_id', id!),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('product_id', id!),
      ]);
      const ev = events.data || [];
      const byType: Record<string, number> = {};
      ev.forEach((e) => (byType[e.event_type] = (byType[e.event_type] || 0) + 1));
      const last = ev.map((e) => e.created_at).sort().pop();
      return {
        byType,
        visitors: new Set(ev.map((e) => e.session_id)).size,
        wishlist: wish.count || 0,
        wardrobe: ward.count || 0,
        leads: leads.count || 0,
        last,
      };
    },
  });

  if (!product) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const landing = `/product/${product.slug}`;

  const cards: [string, number | string][] = [
    ['Unique visitors', stats?.visitors ?? '–'],
    ...Object.keys(LABELS).filter((k) => k !== 'lead_capture').map((k) => [LABELS[k], stats?.byType[k] ?? 0] as [string, number]),
    ['Leads', stats?.leads ?? '–'],
    ['Wishlisted', stats?.wishlist ?? '–'],
    ['In wardrobes', stats?.wardrobe ?? '–'],
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Link to="/products" className="inline-flex items-center text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4 mr-1" />All products</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">{product.product_code} · {product.category} · {product.price}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><a href={landing} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Open landing</a></Button>
          <Button asChild size="sm"><Link to={`${landing}/edit`}><Pencil className="h-4 w-4 mr-1" />Edit</Link></Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Analytics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map(([label, val]) => (
              <div key={label} className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold mt-1">{val}</p>
              </div>
            ))}
          </div>
          {stats?.last && <p className="text-xs text-muted-foreground">Last activity: {new Date(stats.last).toLocaleString()}</p>}
        </div>
        <div>
          <h2 className="text-lg font-medium mb-3">Landing preview</h2>
          <div className="mx-auto w-[390px] max-w-full h-[780px] rounded-[2rem] border-8 border-foreground overflow-hidden bg-background">
            <iframe src={`${landing}?preview=1`} title="Landing preview" className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
