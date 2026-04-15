import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignSource {
  id: string;
  slug: string;
  label: string;
  season: string;
  description: string | null;
  page_url: string;
  created_at: string;
  campaign_assets: CampaignAsset[];
}

export interface CampaignAsset {
  id: string;
  source_id: string;
  original_url: string;
  cached_url: string | null;
  asset_type: string;
  media_type: string;
  label: string;
  enabled: boolean;
  render_mode: string;
  last_health_check: string | null;
  health_status: string;
}

export function useCampaignData() {
  const queryClient = useQueryClient();

  const sourcesQuery = useQuery({
    queryKey: ['campaign-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_sources')
        .select('*, campaign_assets(*)')
        .order('season', { ascending: false });
      if (error) throw error;
      return data as unknown as CampaignSource[];
    },
  });

  const lastScanQuery = useQuery({
    queryKey: ['scrape-logs-last'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scrape_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scrape-campaigns');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sources'] });
      queryClient.invalidateQueries({ queryKey: ['scrape-logs-last'] });
    },
  });

  const updateAssetsMutation = useMutation({
    mutationFn: async (updates: { id: string; enabled: boolean; render_mode: string }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('campaign_assets')
          .update({ enabled: u.enabled, render_mode: u.render_mode })
          .eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sources'] });
    },
  });

  const cacheAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data, error } = await supabase.functions.invoke('cache-asset', {
        body: { asset_id: assetId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sources'] });
    },
  });

  const healthCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-check-assets');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-sources'] });
    },
  });

  return {
    sources: sourcesQuery.data || [],
    isLoading: sourcesQuery.isLoading,
    lastScan: lastScanQuery.data,
    scan: scanMutation,
    updateAssets: updateAssetsMutation,
    cacheAsset: cacheAssetMutation,
    healthCheck: healthCheckMutation,
  };
}
