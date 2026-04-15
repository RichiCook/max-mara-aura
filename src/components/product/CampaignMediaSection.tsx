import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CampaignAsset {
  id: string;
  original_url: string;
  cached_url: string | null;
  render_mode: string;
  label: string;
  campaign_sources: { label: string } | null;
}

function getAssetUrl(asset: CampaignAsset): string {
  if (asset.render_mode === 'download' && asset.cached_url) {
    return asset.cached_url;
  }
  // Use proxy for hotlinked images
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(asset.original_url)}`;
}

export function CampaignMediaSection() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data: assets } = useQuery({
    queryKey: ['campaign-assets-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_assets')
        .select('id, original_url, cached_url, render_mode, label, campaign_sources(label)')
        .eq('enabled', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CampaignAsset[];
    },
  });

  if (!assets?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="font-serif text-lg mb-3">From the Campaign</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {assets.map((asset, idx) => (
          <button
            key={asset.id}
            onClick={() => setLightboxIdx(idx)}
            className="snap-start shrink-0 w-[85%] max-w-[360px] rounded-lg overflow-hidden bg-muted"
          >
            <div className="aspect-video relative">
              <img
                src={getAssetUrl(asset)}
                alt={asset.label}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 text-left">
              <p className="text-xs font-medium truncate">{asset.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {(asset.campaign_sources as any)?.label}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setLightboxIdx(null)}>
            <X className="w-6 h-6" />
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIdx < assets.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={getAssetUrl(assets[lightboxIdx])}
              alt={assets[lightboxIdx].label}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <p className="text-white text-center text-sm mt-2">{assets[lightboxIdx].label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
