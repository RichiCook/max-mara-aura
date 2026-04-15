import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CampaignAsset {
  id: string;
  original_url: string;
  cached_url: string | null;
  render_mode: string;
  label: string;
  campaign_sources: { label: string; page_url: string } | null;
}

function getAssetUrl(asset: CampaignAsset): string {
  if (asset.render_mode === 'download' && asset.cached_url) {
    return asset.cached_url;
  }
  // Use proxy for hotlinked images
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(asset.original_url)}`;
}

export function CampaignMediaSection() {

  const { data: assets } = useQuery({
    queryKey: ['campaign-assets-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_assets')
        .select('id, original_url, cached_url, render_mode, label, campaign_sources(label, page_url)')
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
          <a
            key={asset.id}
            href={(asset.campaign_sources as any)?.page_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
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
          </a>
        ))}
      </div>
    </div>
  );
}
