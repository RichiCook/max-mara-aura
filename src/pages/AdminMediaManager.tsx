import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useCampaignData, CampaignAsset, CampaignSource } from '@/hooks/useCampaignData';
import { toast } from '@/components/ui/sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Link2, Download, RefreshCw, Check, Play, ExternalLink, ImageIcon, AlertTriangle } from 'lucide-react';

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hero: { bg: 'bg-red-100', text: 'text-red-800' },
  'still-life': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  editorial: { bg: 'bg-green-100', text: 'text-green-800' },
  product: { bg: 'bg-amber-100', text: 'text-amber-800' },
  video: { bg: 'bg-purple-100', text: 'text-purple-800' },
};

function AssetCard({
  asset,
  renderMode,
  localEnabled,
  onToggle,
}: {
  asset: CampaignAsset;
  renderMode: string;
  localEnabled: boolean;
  onToggle: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const colors = TYPE_COLORS[asset.asset_type] || TYPE_COLORS.editorial;
  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-image-proxy?url=${encodeURIComponent(asset.original_url)}`;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="relative h-[120px] bg-muted">
        {imgLoading && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {imgError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 p-2 text-center">
            <AlertTriangle className="w-4 h-4" />
            <span>CORS blocked — renders via proxy</span>
          </div>
        ) : (
          <img
            src={asset.cached_url || proxyUrl}
            alt={asset.label}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            onLoad={() => setImgLoading(false)}
          />
        )}
        {localEnabled && (
          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#E00400] flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        {renderMode === 'download' && localEnabled && asset.cached_url && (
          <div className="absolute top-1.5 left-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-sm">LOCAL</Badge>
          </div>
        )}
        {asset.media_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-2 flex items-center gap-2">
        <Badge className={`${colors.bg} ${colors.text} text-[10px] px-1.5 py-0 border-0 shrink-0`}>
          {asset.asset_type}
        </Badge>
        <span className="text-xs text-muted-foreground truncate flex-1">{asset.label}</span>
        <Switch
          checked={localEnabled}
          onCheckedChange={onToggle}
          className="shrink-0 scale-75"
        />
      </div>
    </div>
  );
}

export default function AdminMediaManager() {
  const { sources, isLoading, lastScan, scan, updateAssets } = useCampaignData();
  const [renderMode, setRenderMode] = useState<string>('hotlink');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [localState, setLocalState] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from server data
  const allAssets = useMemo(() => {
    const assets: CampaignAsset[] = [];
    sources.forEach((s) => s.campaign_assets?.forEach((a) => assets.push(a)));
    return assets;
  }, [sources]);

  const getEnabled = (asset: CampaignAsset) => {
    return localState[asset.id] !== undefined ? localState[asset.id] : asset.enabled;
  };

  const toggleAsset = (id: string, current: boolean) => {
    setLocalState((prev) => ({ ...prev, [id]: !current }));
    setHasChanges(true);
  };

  const toggleAllForSource = (source: CampaignSource, enable: boolean) => {
    const updates: Record<string, boolean> = {};
    source.campaign_assets?.forEach((a) => { updates[a.id] = enable; });
    setLocalState((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const filteredSources = useMemo(() => {
    if (seasonFilter === 'all') return sources;
    return sources.filter((s) => s.season === seasonFilter);
  }, [sources, seasonFilter]);

  const enabledCount = allAssets.filter((a) => getEnabled(a)).length;

  const seasons = useMemo(() => {
    const set = new Set(sources.map((s) => s.season));
    return ['all', ...Array.from(set)];
  }, [sources]);

  const handleApply = async () => {
    const updates = allAssets.map((a) => ({
      id: a.id,
      enabled: getEnabled(a),
      render_mode: renderMode,
    }));
    try {
      await updateAssets.mutateAsync(updates);
      setHasChanges(false);
      setLocalState({});
      toast.success('Campaign assets updated');
    } catch {
      toast.error('Failed to update assets');
    }
  };

  const handleScan = async () => {
    try {
      await scan.mutateAsync();
      toast.success('Scan completed');
    } catch {
      toast.error('Scan failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-28">
        <AppHeader />

        {/* Header */}
        <div className="mt-8 mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans mb-1">DPP Media Manager</p>
          <h1 className="font-serif text-2xl font-light tracking-tight">Campaign Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage which campaign imagery appears on Digital Product Passport pages.
          </p>
        </div>

        {/* Render Mode Toggle */}
        <div className="mb-4">
          <ToggleGroup
            type="single"
            value={renderMode}
            onValueChange={(v) => v && setRenderMode(v)}
            className="w-full border rounded-lg p-1"
          >
            <ToggleGroupItem value="hotlink" className="flex-1 text-xs gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Hotlink from source
            </ToggleGroupItem>
            <ToggleGroupItem value="download" className="flex-1 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download to platform
            </ToggleGroupItem>
          </ToggleGroup>
          <div className={`mt-2 rounded-md p-2.5 text-xs ${renderMode === 'download' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
            {renderMode === 'download'
              ? '💾 Images will be fetched and cached on your platform for reliable rendering.'
              : '🔗 Images render directly from the source site. Faster setup, may be subject to availability.'}
          </div>
        </div>

        {/* Scan Button */}
        <Button
          onClick={handleScan}
          disabled={scan.isPending}
          className="w-full bg-[#E00400] hover:bg-[#C00300] text-white mb-3"
        >
          {scan.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scanning {sources.length} pages…
            </>
          ) : lastScan ? (
            'Rescan for new assets'
          ) : (
            'Scan christianlouboutin.com'
          )}
        </Button>

        {lastScan && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            Last scan: {new Date(lastScan.started_at).toLocaleTimeString()} — {lastScan.assets_found} assets across {sources.length} campaigns
          </p>
        )}

        {/* Stats + Filter */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{enabledCount}</span> / {allAssets.length} enabled
          </span>
          <div className="flex gap-1">
            {seasons.map((s) => (
              <button
                key={s}
                onClick={() => setSeasonFilter(s)}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${seasonFilter === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground'}`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign Accordions */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filteredSources.map((source) => {
              const assets = source.campaign_assets || [];
              const srcEnabled = assets.filter((a) => getEnabled(a)).length;
              const allEnabled = assets.length > 0 && srcEnabled === assets.length;

              return (
                <AccordionItem key={source.id} value={source.id} className="border rounded-lg px-3">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-2 flex-1 text-left">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{source.label}</div>
                        <div className="text-[11px] text-muted-foreground italic">{source.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{assets.length}</Badge>
                        {srcEnabled > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-[#E00400] text-white border-0">{srcEnabled}</Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">Include all</span>
                      <Switch
                        checked={allEnabled}
                        onCheckedChange={(checked) => toggleAllForSource(source, checked)}
                        className="scale-75"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {assets.map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          renderMode={renderMode}
                          localEnabled={getEnabled(asset)}
                          onToggle={() => toggleAsset(asset.id, getEnabled(asset))}
                        />
                      ))}
                    </div>
                    <a
                      href={source.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View source page
                    </a>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Sticky Export Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-border z-50">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-white/70">
            <span className="text-white font-medium">{enabledCount} assets</span> selected
            <span className="hidden sm:inline"> · {renderMode === 'download' ? 'Cached' : 'Hotlinked'}</span>
          </div>
          <Button
            onClick={handleApply}
            disabled={!hasChanges || updateAssets.isPending}
            className={`text-xs px-4 ${hasChanges ? 'bg-[#E00400] hover:bg-[#C00300] text-white' : 'bg-muted text-muted-foreground'}`}
          >
            {updateAssets.isPending ? 'Applying…' : 'Apply to DPP'}
          </Button>
        </div>
      </div>
    </div>
  );
}
