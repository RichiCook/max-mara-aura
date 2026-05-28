import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ImageCandidate {
  id: string;
  product_id: string;
  product_code: string | null;
  image_url: string;
  source_order: number;
  machine_label: 'likely_lay_flat' | 'suspicious' | 'rejected' | 'pending';
  machine_confidence: number;
  suspicion_reasons: string[];
  review_status: 'pending' | 'approved' | 'rejected' | 'suspicious' | 'auto_selected';
  is_selected_lay_flat: boolean;
  manual_override: boolean;
  reviewed_at: string | null;
}

export interface ProductWithCandidates {
  id: string;
  name: string;
  slug: string;
  product_code: string | null;
  category: string | null;
  collection: string | null;
  approved_lay_flat_image_url: string | null;
  lay_flat_review_state: string;
  candidates: ImageCandidate[];
}

export function useImageReview(stateFilter?: string) {
  const qc = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['image-review-products', stateFilter || 'all'],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('id, name, slug, product_code, category, collection, approved_lay_flat_image_url, lay_flat_review_state')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (stateFilter && stateFilter !== 'all') {
        q = q.eq('lay_flat_review_state', stateFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data || []).map((p) => p.id);
      if (ids.length === 0) return [] as ProductWithCandidates[];

      const { data: cands } = await supabase
        .from('product_image_candidates')
        .select('*')
        .in('product_id', ids)
        .order('source_order', { ascending: true });

      const byProduct = new Map<string, ImageCandidate[]>();
      (cands || []).forEach((c: any) => {
        const arr = byProduct.get(c.product_id) || [];
        arr.push(c as ImageCandidate);
        byProduct.set(c.product_id, arr);
      });

      return (data || []).map((p) => ({
        ...(p as any),
        candidates: byProduct.get(p.id) || [],
      })) as ProductWithCandidates[];
    },
  });

  const countsQuery = useQuery({
    queryKey: ['image-review-counts'],
    queryFn: async () => {
      const states = ['pending', 'auto_selected', 'approved', 'suspicious', 'missing', 'rejected'];
      const results: Record<string, number> = {};
      for (const s of states) {
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('lay_flat_review_state', s);
        results[s] = count || 0;
      }
      return results;
    },
  });

  const classify = useMutation({
    mutationFn: async (opts: { all?: boolean; productIds?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('classify-product-images', { body: opts });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['image-review-products'] });
      qc.invalidateQueries({ queryKey: ['image-review-counts'] });
    },
  });

  const setApprovedImage = useMutation({
    mutationFn: async ({ productId, imageUrl, candidateId }: { productId: string; imageUrl: string | null; candidateId?: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      // Clear selection on all candidates for this product
      await supabase
        .from('product_image_candidates')
        .update({ is_selected_lay_flat: false })
        .eq('product_id', productId);
      if (candidateId) {
        await supabase
          .from('product_image_candidates')
          .update({
            is_selected_lay_flat: true,
            review_status: 'approved',
            manual_override: true,
            reviewed_at: new Date().toISOString(),
            reviewed_by: userId,
          })
          .eq('id', candidateId);
      }
      await supabase
        .from('products')
        .update({
          approved_lay_flat_image_url: imageUrl,
          lay_flat_review_state: imageUrl ? 'approved' : 'missing',
        })
        .eq('id', productId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['image-review-products'] });
      qc.invalidateQueries({ queryKey: ['image-review-counts'] });
    },
  });

  const markSuspicious = useMutation({
    mutationFn: async (productId: string) => {
      await supabase
        .from('products')
        .update({ lay_flat_review_state: 'suspicious' })
        .eq('id', productId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['image-review-products'] });
      qc.invalidateQueries({ queryKey: ['image-review-counts'] });
    },
  });

  const rejectCandidate = useMutation({
    mutationFn: async (candidateId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      await supabase
        .from('product_image_candidates')
        .update({
          review_status: 'rejected',
          is_selected_lay_flat: false,
          manual_override: true,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', candidateId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['image-review-products'] });
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    counts: countsQuery.data || {},
    classify,
    setApprovedImage,
    markSuspicious,
    rejectCandidate,
    refetch: productsQuery.refetch,
  };
}
