import { supabase } from '@/integrations/supabase/client';

export type LookMode = 'photo' | 'collage';

export interface LookModeRules {
  default_mode: 'auto' | LookMode;
  rule: 'category_mix' | 'product_count' | 'fixed';
  apparel_categories: string[];
  count_threshold: number;
}

export const DEFAULT_LOOK_MODE_RULES: LookModeRules = {
  default_mode: 'auto',
  rule: 'category_mix',
  apparel_categories: ['dress', 'coat', 'top', 'shirt', 'skirt', 'pants', 'trousers', 'suit', 'jacket', 'blouse', 'sweater', 'knitwear'],
  count_threshold: 4,
};

export async function fetchLookModeRules(): Promise<LookModeRules> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'look_mode_rules')
      .maybeSingle();
    if (data?.value) {
      return { ...DEFAULT_LOOK_MODE_RULES, ...(data.value as any) };
    }
  } catch { /* ignore */ }
  return DEFAULT_LOOK_MODE_RULES;
}

export async function saveLookModeRules(rules: LookModeRules): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({
    id: 'look_mode_rules',
    value: rules as any,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function resolveLookMode(
  products: Array<{ category?: string | null }>,
  rules: LookModeRules
): LookMode {
  if (rules.rule === 'fixed') {
    return rules.default_mode === 'collage' ? 'collage' : 'photo';
  }
  if (rules.rule === 'product_count') {
    return products.length >= rules.count_threshold ? 'photo' : 'collage';
  }
  // category_mix
  const apparel = rules.apparel_categories.map(c => c.toLowerCase().trim());
  const hasApparel = products.some(p => {
    const cat = (p.category || '').toLowerCase();
    return apparel.some(a => a && cat.includes(a));
  });
  return hasApparel ? 'photo' : 'collage';
}
