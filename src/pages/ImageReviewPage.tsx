import { useState, useEffect, useRef } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Image as ImageIcon, Loader2, Link as LinkIcon } from 'lucide-react';
import { useImageReview, type ProductWithCandidates, type ImageCandidate } from '@/hooks/useImageReview';
import { Link } from 'react-router-dom';

const STATE_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'missing', label: 'Missing lay-flat' },
  { id: 'pending', label: 'Pending' },
  { id: 'auto_selected', label: 'Auto-selected' },
  { id: 'approved', label: 'Approved' },
];

function labelBadge(label: string) {
  if (label === 'likely_lay_flat') return <Badge className="bg-green-100 text-green-800 border-0">lay-flat</Badge>;
  if (label === 'suspicious') return <Badge className="bg-amber-100 text-amber-800 border-0">suspicious</Badge>;
  if (label === 'rejected') return <Badge className="bg-red-100 text-red-800 border-0">rejected</Badge>;
  return <Badge variant="outline">pending</Badge>;
}

function stateBadge(state: string) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    auto_selected: 'bg-blue-100 text-blue-800',
    suspicious: 'bg-amber-100 text-amber-800',
    missing: 'bg-red-100 text-red-800',
    pending: 'bg-muted text-muted-foreground',
    rejected: 'bg-red-100 text-red-800',
  };
  return <Badge className={`${map[state] || 'bg-muted'} border-0 capitalize`}>{state.replace('_', ' ')}</Badge>;
}

function ProductCard({ product, onApprove, onReject, onMarkSuspicious, onSetCustomUrl, onClassify, classifying }: {
  product: ProductWithCandidates;
  onApprove: (productId: string, imageUrl: string, candidateId?: string) => void;
  onReject: (candidateId: string) => void;
  onMarkSuspicious: (productId: string) => void;
  onSetCustomUrl: (productId: string, url: string) => void;
  onClassify: (productId: string) => void;
  classifying: boolean;
}) {

  const [customUrl, setCustomUrl] = useState('');
  const approvedUrl = product.approved_lay_flat_image_url;

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm truncate">{product.name}</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{product.product_code || '—'}</span>
              {product.category && <span>· {product.category}</span>}
              {product.collection && <span>· {product.collection}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stateBadge(product.lay_flat_review_state)}
            <Link to={`/product/${product.slug}/edit`} className="text-xs text-primary hover:underline">Edit</Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {product.candidates.length === 0 ? (
          product.raw_images.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <span>Not classified yet — {product.raw_images.length} scraped image{product.raw_images.length === 1 ? '' : 's'} found.</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={classifying} onClick={() => onClassify(product.id)}>
                  {classifying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Classify now
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {product.raw_images.map((url, i) => (
                  <div key={i} className="relative rounded border border-border overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      <div className="absolute top-1 left-1"><Badge variant="outline" className="text-[9px]">unclassified</Badge></div>
                    </div>
                    <div className="p-2 space-y-1.5">
                      <div className="text-[10px] text-muted-foreground line-clamp-1" title={url}>{url.split('/').pop()}</div>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] w-full"
                        onClick={() => onApprove(product.id, url)}>
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Use as lay-flat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-3 text-center bg-muted/30 rounded">
              No scraped images. Run classification or add a URL below.
            </div>
          )
        ) : (

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {product.candidates.map((c: ImageCandidate) => {
              const isApproved = approvedUrl === c.image_url;
              return (
                <div key={c.id} className={`relative rounded border overflow-hidden ${isApproved ? 'ring-2 ring-primary' : 'border-border'}`}>
                  <div className="aspect-square bg-muted relative">
                    <img
                      src={c.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                    <div className="absolute top-1 left-1">{labelBadge(c.machine_label)}</div>
                    {isApproved && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                        SELECTED
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground line-clamp-1" title={c.image_url}>
                      {c.image_url.split('/').pop()}
                    </div>
                    {c.suspicion_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.suspicion_reasons.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{r}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant={isApproved ? 'default' : 'outline'} className="flex-1 h-6 text-[10px]"
                        onClick={() => onApprove(product.id, c.image_url, c.id)}>
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Use
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                        onClick={() => onReject(c.id)}>
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Input
            placeholder="Paste replacement image URL"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" disabled={!customUrl.trim()} className="h-8"
            onClick={() => { onSetCustomUrl(product.id, customUrl.trim()); setCustomUrl(''); }}>
            <LinkIcon className="w-3 h-3 mr-1" /> Set
          </Button>
          <Button size="sm" variant="outline" className="h-8"
            onClick={() => onMarkSuspicious(product.id)}>
            <AlertTriangle className="w-3 h-3 mr-1" /> Flag
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImageReviewPage() {
  const [filter, setFilter] = useState('suspicious');
  const [scanProgress, setScanProgress] = useState<{ processed: number; remaining: number } | null>(null);
  const { products, isLoading, counts, classify, setApprovedImage, markSuspicious, rejectCandidate, refetch } = useImageReview(filter);

  const handleClassify = async (all: boolean) => {
    setScanProgress({ processed: 0, remaining: 0 });
    let totalProcessed = 0;
    let totalSuspicious = 0;
    let totalMissing = 0;
    try {
      // Chain batches until no products remain in pending. `all=true` rescans
      // every product once (single batch via `product_ids` is not needed —
      // ordering by updated_at asc keeps the cursor moving).
      // For "all" we run a single pass over the oldest 500; the admin can re-click.
      let safety = 50; // hard cap on chained calls
      do {
        const res: any = await classify.mutateAsync({ all, limit: all ? 500 : 200 });
        totalProcessed += res?.processed ?? 0;
        totalSuspicious += res?.suspiciousCount ?? 0;
        totalMissing += res?.missingCount ?? 0;
        setScanProgress({ processed: totalProcessed, remaining: res?.remaining ?? 0 });
        if (all) break; // one batch for full rescans; user can re-click
        if (!res?.hasMore || (res?.processed ?? 0) === 0) break;
        safety--;
      } while (safety > 0);

      toast.success(`Scanned ${totalProcessed} products — ${totalSuspicious} suspicious, ${totalMissing} missing`);
    } catch (err: any) {
      toast.error(err?.message || 'Classification failed');
    } finally {
      setScanProgress(null);
    }
  };

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <div className="admin-subtitle mb-2">Quality</div>
        <h1 className="admin-page-title mb-1">Lay-flat Image Review</h1>
        <p className="admin-body-secondary">
          Approve the right lay-flat image per product. Suspicious ones are flagged automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button onClick={() => handleClassify(false)} disabled={classify.isPending} size="sm">
          {classify.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Scan unreviewed
        </Button>
        <Button onClick={() => handleClassify(true)} disabled={classify.isPending} size="sm" variant="outline">
          Rescan batch of 500
        </Button>
        <Button onClick={() => refetch()} size="sm" variant="ghost">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
        {scanProgress && (
          <span className="text-xs text-muted-foreground ml-2">
            Processed {scanProgress.processed} · {scanProgress.remaining} pending left
          </span>
        )}
      </div>


      {/* State filter pills with counts */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATE_FILTERS.map((s) => {
          const count = s.id === 'all' ? Object.values(counts).reduce((a, b) => a + (b as number), 0) : (counts[s.id] || 0);
          return (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                filter === s.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground'
              }`}
            >
              {s.label} <span className="opacity-60 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading products…
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No products in this state.</p>
            <p className="text-xs mt-1">Run "Scan unreviewed" to classify scraped images.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onApprove={(productId, imageUrl, candidateId) => {
                setApprovedImage.mutate({ productId, imageUrl, candidateId });
                toast.success('Lay-flat approved');
              }}
              onReject={(candidateId) => rejectCandidate.mutate(candidateId)}
              onMarkSuspicious={(productId) => markSuspicious.mutate(productId)}
              onSetCustomUrl={(productId, url) => {
                setApprovedImage.mutate({ productId, imageUrl: url });
                toast.success('Custom URL set');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
