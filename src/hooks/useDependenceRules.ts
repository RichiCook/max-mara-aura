import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DependenceRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  status: string;
  trigger_categories: string[];
  trigger_filters: Record<string, any>;
  target_category: string;
  match_dimensions: string[];
  target_attribute_overrides: Record<string, any>;
  max_results: number;
  sort_by: string;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  rule_id: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  diff: Record<string, any> | null;
}

export const useDependenceRules = () => {
  const [rules, setRules] = useState<DependenceRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dependence_rules')
      .select('*')
      .order('priority', { ascending: true });

    if (!error && data) {
      setRules(data.map(r => ({
        ...r,
        trigger_filters: (r.trigger_filters || {}) as Record<string, any>,
        target_attribute_overrides: (r.target_attribute_overrides || {}) as Record<string, any>,
      })) as DependenceRule[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const createRule = async (rule: Partial<DependenceRule>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await supabase
      .from('dependence_rules')
      .insert({
        name: rule.name || 'New Rule',
        description: rule.description || null,
        is_active: false,
        priority: rule.priority ?? rules.length + 1,
        status: 'draft',
        trigger_categories: rule.trigger_categories || [],
        trigger_filters: rule.trigger_filters || {},
        target_category: rule.target_category || 'shoes',
        match_dimensions: rule.match_dimensions || ['color'],
        target_attribute_overrides: rule.target_attribute_overrides || {},
        max_results: rule.max_results ?? 8,
        sort_by: rule.sort_by || 'best_sellers',
        created_by: userId,
      } as any)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Audit log
    if (data) {
      await supabase.from('dependence_rule_audit_log').insert({
        rule_id: data.id,
        action: 'created',
        performed_by: userId,
      } as any);
    }

    await fetchRules();
    return { success: true, data };
  };

  const updateRule = async (id: string, updates: Partial<DependenceRule>) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await supabase
      .from('dependence_rules')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    await supabase.from('dependence_rule_audit_log').insert({
      rule_id: id,
      action: 'edited',
      performed_by: userId,
    } as any);

    await fetchRules();
    return { success: true };
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('dependence_rules')
      .delete()
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    await fetchRules();
    return { success: true };
  };

  const submitForReview = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    await supabase.from('dependence_rules').update({ status: 'pending_review' } as any).eq('id', id);
    await supabase.from('dependence_rule_audit_log').insert({
      rule_id: id,
      action: 'submitted_for_review',
      performed_by: userId,
    } as any);
    await fetchRules();
  };

  const approveRule = async (id: string, notes?: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    await supabase.from('dependence_rules').update({
      status: 'approved',
      is_active: true,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    } as any).eq('id', id);

    await supabase.from('dependence_rule_audit_log').insert({
      rule_id: id,
      action: 'approved',
      performed_by: userId,
      notes,
    } as any);
    await fetchRules();
  };

  const sendBackToDraft = async (id: string, notes?: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    await supabase.from('dependence_rules').update({ status: 'draft', is_active: false } as any).eq('id', id);
    await supabase.from('dependence_rule_audit_log').insert({
      rule_id: id,
      action: 'sent_back',
      performed_by: userId,
      notes,
    } as any);
    await fetchRules();
  };

  const pauseRule = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    await supabase.from('dependence_rules').update({ status: 'paused', is_active: false } as any).eq('id', id);
    await supabase.from('dependence_rule_audit_log').insert({
      rule_id: id,
      action: 'paused',
      performed_by: userId,
    } as any);
    await fetchRules();
  };

  const fetchAuditLog = async (ruleId: string): Promise<AuditLogEntry[]> => {
    const { data } = await supabase
      .from('dependence_rule_audit_log')
      .select('*')
      .eq('rule_id', ruleId)
      .order('performed_at', { ascending: false });
    return (data || []) as AuditLogEntry[];
  };

  const seedDefaultRules = async () => {
    const defaults = [
      { name: 'Shoes → Matching bags', description: 'Viewing shoes suggests bags of the same color and collection', trigger_categories: ['shoes'], trigger_filters: { gender: 'women' }, target_category: 'bags', match_dimensions: ['color', 'collection', 'price_tier'], priority: 1 },
      { name: 'Bags → Complementary shoes', description: 'Viewing a bag suggests shoes that complete the look', trigger_categories: ['bags'], trigger_filters: { gender: 'women' }, target_category: 'shoes', match_dimensions: ['color', 'collection', 'style_mood'], priority: 2 },
      { name: 'Perfume → Matching shoes', description: 'Fragrance buyers often consider statement shoes', trigger_categories: ['beauty'], trigger_filters: {}, target_category: 'shoes', match_dimensions: ['style_mood', 'occasion', 'gender'], priority: 3 },
      { name: 'Perfume → Leather accessories', description: 'Pair fragrance with a small leather gift', trigger_categories: ['beauty'], trigger_filters: {}, target_category: 'small_leather_goods', match_dimensions: ['price_tier', 'gender'], priority: 4 },
      { name: 'Any → Eyewear (Signature gaze)', description: 'Summer 2026 eyewear pairs with most of the collection', trigger_categories: ['shoes', 'bags'], trigger_filters: {}, target_category: 'eyewear', match_dimensions: ['collection'], priority: 5 },
      { name: 'Bridal shoes → Bridal accessories', description: 'Complete bridal look', trigger_categories: ['shoes'], trigger_filters: { occasion: 'bridal' }, target_category: 'small_leather_goods', match_dimensions: ['occasion', 'color'], priority: 6 },
      { name: "Men's shoes → Men's accessories", description: "Cross-sell men's bags/wallets with men's shoes", trigger_categories: ['shoes'], trigger_filters: { gender: 'men' }, target_category: 'bags', match_dimensions: ['color', 'material'], priority: 7 },
    ];
    for (const rule of defaults) {
      await createRule(rule);
    }
  };

  return {
    rules,
    loading,
    refetch: fetchRules,
    createRule,
    updateRule,
    deleteRule,
    submitForReview,
    approveRule,
    sendBackToDraft,
    pauseRule,
    fetchAuditLog,
    seedDefaultRules,
  };
};
