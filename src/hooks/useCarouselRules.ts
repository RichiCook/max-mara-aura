import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarouselRule {
  id: string;
  carousel_id: string;
  priority: number;
  is_active: boolean;
  trigger_categories: string[];
  trigger_filters: Record<string, any>;
  target_category: string;
  match_dimensions: string[];
  target_attribute_overrides: Record<string, any>;
  max_results: number;
  sort_by: string;
  created_at: string;
  updated_at: string;
}

export const useCarouselRules = (carouselId: string | null) => {
  const [rules, setRules] = useState<CarouselRule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!carouselId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_rules')
      .select('*')
      .eq('carousel_id', carouselId)
      .order('priority', { ascending: true });

    if (!error && data) {
      setRules(data.map(r => ({
        ...r,
        trigger_filters: (r.trigger_filters || {}) as Record<string, any>,
        target_attribute_overrides: (r.target_attribute_overrides || {}) as Record<string, any>,
      })) as CarouselRule[]);
    }
    setLoading(false);
  }, [carouselId]);

  const createRule = async (rule: Partial<CarouselRule>) => {
    if (!carouselId) return { success: false, error: 'No carousel' };
    const { error } = await supabase.from('carousel_rules').insert({
      carousel_id: carouselId,
      priority: rule.priority ?? rules.length + 1,
      is_active: rule.is_active ?? true,
      trigger_categories: rule.trigger_categories || ['any'],
      trigger_filters: rule.trigger_filters || {},
      target_category: rule.target_category || 'shoes',
      match_dimensions: rule.match_dimensions || ['color'],
      target_attribute_overrides: rule.target_attribute_overrides || {},
      max_results: rule.max_results ?? 8,
      sort_by: rule.sort_by || 'best_sellers',
    } as any);
    if (error) return { success: false, error: error.message };
    await fetchRules();
    return { success: true };
  };

  const updateRule = async (id: string, updates: Partial<CarouselRule>) => {
    const { error } = await supabase
      .from('carousel_rules')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    await fetchRules();
    return { success: true };
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('carousel_rules').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    await fetchRules();
    return { success: true };
  };

  return { rules, loading, fetchRules, createRule, updateRule, deleteRule };
};
