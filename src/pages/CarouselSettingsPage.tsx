import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Eye, EyeOff, Pencil, Check, X, Sparkles, ChevronDown, GripVertical, ArrowRight } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useCarouselDefinitions, CarouselDefinition } from '@/hooks/useProductCarousels';
import { useCarouselRules, CarouselRule } from '@/hooks/useCarouselRules';
import { supabase } from '@/integrations/supabase/client';

const MATCH_TYPE_GROUPS = ['Basic', 'Smart', 'Cross-Sell', 'Personalized', 'Dynamic'];

const MATCH_TYPES = [
  { value: 'category', label: 'Same Category', group: 'Basic' },
  { value: 'collection', label: 'Same Collection', group: 'Basic' },
  { value: 'color', label: 'Same Color', group: 'Basic' },
  { value: 'manual', label: 'Manual Picks', group: 'Basic' },
  { value: 'complete_look', label: 'Complete the Look', group: 'Smart' },
  { value: 'material', label: 'Same Material', group: 'Smart' },
  { value: 'silhouette', label: 'Same Silhouette Family', group: 'Smart' },
  { value: 'heel_height', label: 'Same Heel Height', group: 'Smart' },
  { value: 'price_range', label: 'Same Price Range', group: 'Smart' },
  { value: 'cross_category', label: 'Cross-Category Rules', group: 'Cross-Sell' },
  { value: 'recently_viewed', label: 'Recently Viewed by You', group: 'Personalized' },
  { value: 'customers_also_viewed', label: 'Customers Also Viewed', group: 'Personalized' },
  { value: 'ai_recommend', label: 'You May Also Like (AI)', group: 'Personalized' },
  { value: 'trending', label: 'Trending Now', group: 'Dynamic' },
  { value: 'new_arrivals', label: 'New Arrivals', group: 'Dynamic' },
];

const CARD_SIZES = [
  { value: 'small', label: 'Small (148px)' },
  { value: 'medium', label: 'Medium (180px)' },
  { value: 'large', label: 'Large (240px)' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'best_sellers', label: 'Best sellers' },
  { value: 'price_asc', label: 'Price ascending' },
  { value: 'price_desc', label: 'Price descending' },
  { value: 'random', label: 'Random' },
];

const DISPLAY_POSITIONS = [
  { value: 'below_product_info', label: 'Below product info' },
  { value: 'below_gallery', label: 'Below gallery' },
  { value: 'bottom', label: 'Bottom of page' },
];

const CATEGORY_OPTIONS = ['all', 'Shoes', 'Bags', 'Accessories', 'Beauty'];

const TARGET_CATEGORIES = [
  { value: 'shoes', label: 'Shoes' },
  { value: 'bags', label: 'Bags' },
  { value: 'small_leather_goods', label: 'Small Leather Goods' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'eyewear', label: 'Eyewear' },
  { value: 'beauty', label: 'Beauty & Fragrance' },
  { value: 'any', label: 'Any category' },
];

const MATCH_DIMENSIONS = [
  { value: 'color', label: 'Color' },
  { value: 'collection', label: 'Collection' },
  { value: 'material', label: 'Material' },
  { value: 'price_tier', label: 'Price tier' },
  { value: 'gender', label: 'Gender' },
  { value: 'style_mood', label: 'Style mood' },
  { value: 'occasion', label: 'Occasion' },
  { value: 'silhouette_family', label: 'Silhouette' },
];

const TRIGGER_CATEGORIES = [
  { value: 'any', label: 'Any category' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bags', label: 'Bags' },
  { value: 'small_leather_goods', label: 'Small Leather Goods' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'eyewear', label: 'Eyewear' },
  { value: 'beauty', label: 'Beauty' },
];

const FALLBACK_OPTIONS = [
  { value: 'use_match_type', label: 'Use Match Type from Setup tab' },
  { value: 'hide', label: 'Show nothing (hide carousel)' },
  { value: 'featured_products', label: 'Show featured products' },
];

const TITLE_DEFAULTS: Record<string, string> = {
  category: 'Similar Products', collection: 'From the Collection', color: 'Same Color',
  manual: 'Our Picks', complete_look: 'Complete the Look', material: 'Same Material',
  silhouette: 'Same Silhouette', heel_height: 'Similar Heel Height', price_range: 'Similar Price',
  recently_viewed: 'Recently Viewed', customers_also_viewed: 'Customers Also Viewed',
  ai_recommend: 'You May Also Like', trending: 'Trending Now', new_arrivals: 'New Arrivals',
  cross_category: 'You Might Also Like',
};

const RULE_MATCH_STRATEGIES = [
  { value: 'color', label: 'Color' },
  { value: 'price_range', label: 'Price Range' },
  { value: 'collection', label: 'Collection' },
  { value: 'material', label: 'Material' },
  { value: 'random', label: 'Random' },
  { value: 'newest', label: 'Newest' },
  { value: 'best_sellers', label: 'Best Sellers' },
];

// ─── Rule Editor Component ───
const RuleCard = ({
  rule, index, onUpdate, onDelete, ruleStats,
}: {
  rule: CarouselRule; index: number;
  onUpdate: (updates: Partial<CarouselRule>) => void;
  onDelete: () => void;
  ruleStats?: { views: number; clicks: number };
}) => {
  const [expanded, setExpanded] = useState(false);
  const triggerLabel = rule.trigger_categories.includes('any') ? 'Any' : rule.trigger_categories.join(', ');
  const targetLabel = TARGET_CATEGORIES.find(t => t.value === rule.target_category)?.label || rule.target_category;
  const primaryDim = rule.match_dimensions[0] || 'color';
  const primaryDimLabel = RULE_MATCH_STRATEGIES.find(s => s.value === primaryDim)?.label || primaryDim;
  const titleTemplate = (rule.target_attribute_overrides as any)?.title_template || '';
  const ctr = ruleStats && ruleStats.views > 0 ? ((ruleStats.clicks / ruleStats.views) * 100).toFixed(1) : null;

  return (
    <Card className="border-border/60">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
        <Badge variant="outline" className="text-[10px] font-mono w-6 h-6 flex items-center justify-center p-0">{index + 1}</Badge>
        <div className="flex-1 flex items-center gap-1 text-sm flex-wrap">
          <span className="text-muted-foreground text-xs">When viewing</span>
          <Select value={rule.trigger_categories.includes('any') ? 'any' : rule.trigger_categories[0] || 'any'}
            onValueChange={v => { onUpdate({ trigger_categories: [v] }); }}>
            <SelectTrigger className="h-6 text-xs w-auto min-w-[80px] border-dashed px-2" onClick={e => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={e => e.stopPropagation()}>
              {TRIGGER_CATEGORIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">Show</span>
          <Select value={rule.target_category} onValueChange={v => onUpdate({ target_category: v })}>
            <SelectTrigger className="h-6 text-xs w-auto min-w-[80px] border-dashed px-2" onClick={e => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={e => e.stopPropagation()}>
              {TARGET_CATEGORIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs mx-0.5">|</span>
          <span className="text-muted-foreground text-xs">Match:</span>
          <Select value={primaryDim} onValueChange={v => onUpdate({ match_dimensions: [v] })}>
            <SelectTrigger className="h-6 text-xs w-auto min-w-[70px] border-dashed px-2" onClick={e => e.stopPropagation()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={e => e.stopPropagation()}>
              {RULE_MATCH_STRATEGIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs mx-0.5">|</span>
          <span className="text-muted-foreground text-xs">Max:</span>
          <Input type="number" min={1} max={24}
            value={rule.max_results}
            onChange={e => onUpdate({ max_results: parseInt(e.target.value) || 8 })}
            onClick={e => e.stopPropagation()}
            className="h-6 text-xs w-12 text-center px-1 border-dashed" />
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {ruleStats && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mr-2">
              <span>{ruleStats.clicks} clicks</span>
              {ctr && <span className="font-medium">{ctr}%</span>}
            </div>
          )}
          <Switch checked={rule.is_active} onCheckedChange={v => onUpdate({ is_active: v })} />
          <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <CardContent className="pt-0 space-y-4 border-t border-border/40">
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="space-y-2">
              <Label className="text-xs">Trigger categories</Label>
              <div className="flex gap-1 flex-wrap">
                {TRIGGER_CATEGORIES.map(tc => {
                  const sel = rule.trigger_categories.includes(tc.value);
                  return (
                    <Badge key={tc.value} variant={sel ? 'default' : 'outline'} className="cursor-pointer text-[10px]"
                      onClick={() => {
                        if (tc.value === 'any') { onUpdate({ trigger_categories: ['any'] }); return; }
                        const without = rule.trigger_categories.filter(c => c !== 'any' && c !== tc.value);
                        onUpdate({ trigger_categories: sel ? (without.length ? without : ['any']) : [...without, tc.value] });
                      }}>
                      {tc.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Target category</Label>
              <Select value={rule.target_category} onValueChange={v => onUpdate({ target_category: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TARGET_CATEGORIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Match dimensions</Label>
            <div className="flex gap-1 flex-wrap">
              {MATCH_DIMENSIONS.map(md => {
                const sel = rule.match_dimensions.includes(md.value);
                return (
                  <Badge key={md.value} variant={sel ? 'default' : 'outline'} className="cursor-pointer text-[10px]"
                    onClick={() => onUpdate({ match_dimensions: sel ? rule.match_dimensions.filter(d => d !== md.value) : [...rule.match_dimensions, md.value] })}>
                    {md.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Max results</Label>
              <Input type="number" className="h-8 text-xs" min={1} max={50} value={rule.max_results} onChange={e => onUpdate({ max_results: parseInt(e.target.value) || 8 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort by</Label>
              <Select value={rule.sort_by} onValueChange={v => onUpdate({ sort_by: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Input type="number" className="h-8 text-xs" min={1} value={rule.priority} onChange={e => onUpdate({ priority: parseInt(e.target.value) || 1 })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Title template</Label>
            <Input className="h-8 text-xs" placeholder="e.g. Pair it with {target_category}" value={titleTemplate}
              onChange={e => onUpdate({
                target_attribute_overrides: { ...rule.target_attribute_overrides, title_template: e.target.value || undefined }
              })} />
            <p className="text-[10px] text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{target_category}'}</code> and <code className="bg-muted px-1 rounded">{'{match_type}'}</code> as placeholders. Leave empty for auto-generated title.
            </p>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="w-3 h-3" />Advanced trigger filters
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Gender</Label>
                <Select value={(rule.trigger_filters as any)?.gender || ''} onValueChange={v => onUpdate({ trigger_filters: { ...rule.trigger_filters, gender: v || undefined } })}>
                  <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="unisex">Unisex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Collection</Label>
                <Input className="h-7 text-[10px]" placeholder="e.g. summer_2026" value={(rule.trigger_filters as any)?.collection || ''}
                  onChange={e => onUpdate({ trigger_filters: { ...rule.trigger_filters, collection: e.target.value || undefined } })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Occasion</Label>
                <Input className="h-7 text-[10px]" placeholder="e.g. bridal" value={(rule.trigger_filters as any)?.occasion || ''}
                  onChange={e => onUpdate({ trigger_filters: { ...rule.trigger_filters, occasion: e.target.value || undefined } })} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
};

// ─── Rules Tab ───
const CarouselRulesTab = ({
  carouselId, fallbackBehavior, onFallbackChange, isCrossCategory,
}: {
  carouselId: string; fallbackBehavior: string; onFallbackChange: (v: string) => void; isCrossCategory?: boolean;
}) => {
  const { rules, loading, fetchRules, createRule, updateRule, deleteRule } = useCarouselRules(carouselId);
  const [ruleAnalytics, setRuleAnalytics] = useState<Record<string, { views: number; clicks: number }>>({});

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // Fetch per-rule analytics
  useEffect(() => {
    const fetchRuleAnalytics = async () => {
      const { data } = await supabase.from('recommendation_clicks')
        .select('rule_id')
        .eq('carousel_id', carouselId)
        .not('rule_id', 'is', null)
        .gte('clicked_at', new Date(Date.now() - 30 * 86400000).toISOString());
      if (data) {
        const counts: Record<string, number> = {};
        for (const row of data) if (row.rule_id) counts[row.rule_id] = (counts[row.rule_id] || 0) + 1;
        const result: Record<string, { views: number; clicks: number }> = {};
        for (const [id, clicks] of Object.entries(counts)) result[id] = { views: Math.round(clicks / 0.077), clicks };
        setRuleAnalytics(result);
      }
    };
    fetchRuleAnalytics();
  }, [carouselId, rules]);

  const handleAddRule = async () => {
    await createRule({ target_category: 'bags', match_dimensions: ['color'], priority: rules.length + 1 });
  };

  if (loading) return <div className="py-6 text-center text-muted-foreground text-sm">Loading rules...</div>;

  return (
    <div className="space-y-4">
      {isCrossCategory && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-primary">Cross-Category Mode Active</p>
          <p className="text-xs text-muted-foreground mt-1">
            Rules below define which categories to cross-sell. Each rule fires when a customer views a product matching the trigger category, and shows products from the target category.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Recommendation Rules</p>
          <p className="text-xs text-muted-foreground">Rules apply top-to-bottom; first matching rule's products are shown first, then subsequent rules fill remaining slots.</p>
        </div>
        <Button size="sm" onClick={handleAddRule}><Plus className="w-3.5 h-3.5 mr-1" />Add Rule</Button>
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No rules yet. {isCrossCategory ? 'Add rules to define cross-category behavior.' : 'This carousel will fall back to the Match Type configured in Setup.'}</p>
            {isCrossCategory && (
              <Button size="sm" variant="outline" className="mt-3" onClick={handleAddRule}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add your first rule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <RuleCard key={rule.id} rule={rule} index={i}
              ruleStats={ruleAnalytics[rule.id]}
              onUpdate={updates => updateRule(rule.id, updates)}
              onDelete={() => { if (confirm('Delete this rule?')) deleteRule(rule.id); }} />
          ))}
        </div>
      )}

      <Separator />
      <div className="space-y-2">
        <Label className="text-xs">When no rules match</Label>
        <Select value={fallbackBehavior} onValueChange={onFallbackChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{FALLBACK_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
};

// ─── Main Page ───
const CarouselSettingsPage = () => {
  const { carousels, loading, createCarousel, updateCarousel, deleteCarousel, refetch, installEssentials } = useCarouselDefinitions();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CarouselDefinition & { target_category: string; target_attribute_overrides: Record<string, any>; fallback_behavior: string }>>({});
  const [analytics, setAnalytics] = useState<Record<string, { views: number; clicks: number }>>({});
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data } = await supabase.from('recommendation_clicks').select('carousel_id').gte('clicked_at', new Date(Date.now() - 30 * 86400000).toISOString());
      if (data) {
        const counts: Record<string, number> = {};
        for (const row of data) counts[row.carousel_id] = (counts[row.carousel_id] || 0) + 1;
        const result: Record<string, { views: number; clicks: number }> = {};
        for (const [id, clicks] of Object.entries(counts)) result[id] = { views: Math.round(clicks / 0.077), clicks };
        setAnalytics(result);
      }
    };
    fetchAnalytics();
  }, [carousels]);

  const handleCreate = async () => {
    const result = await createCarousel({ name: 'New Carousel', match_type: 'category', match_config: { fallback_to_collection: true, max_items: 12 }, layout: { card_size: 'small', columns: 4 } });
    if (result.success) toast({ title: 'Carousel created' });
    else toast({ title: 'Failed', description: result.error, variant: 'destructive' });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => { await updateCarousel(id, { is_active: !isActive } as any); };
  const handleDelete = async (id: string) => { if (confirm('Delete this carousel?')) { const r = await deleteCarousel(id); if (r.success) toast({ title: 'Deleted' }); } };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setActiveTab(c.match_type === 'cross_category' ? 'rules' : 'setup');
    setEditForm({
      name: c.name, match_type: c.match_type, match_config: { ...c.match_config },
      layout: { ...c.layout }, display_position: c.display_position,
      show_on_categories: [...c.show_on_categories], min_products: c.min_products,
      sort_by: c.sort_by, exclude_current: c.exclude_current,
      target_category: c.target_category || 'same',
      target_attribute_overrides: c.target_attribute_overrides || {},
      fallback_behavior: c.fallback_behavior || 'use_match_type',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await updateCarousel(editingId, editForm as any);
    if (result.success) { setEditingId(null); toast({ title: 'Updated' }); }
    else toast({ title: 'Failed', description: result.error, variant: 'destructive' });
  };

  const moveCarousel = async (id: string, direction: 'up' | 'down') => {
    const idx = carousels.findIndex(c => c.id === id);
    if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= carousels.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    await Promise.all([
      updateCarousel(carousels[idx].id, { display_order: carousels[swapIdx].display_order } as any),
      updateCarousel(carousels[swapIdx].id, { display_order: carousels[idx].display_order } as any),
    ]);
    refetch();
  };

  const updateMatchType = (v: string) => {
    setEditForm(f => ({
      ...f, match_type: v,
      name: f.name === TITLE_DEFAULTS[f.match_type || ''] || f.name === 'New Carousel' ? TITLE_DEFAULTS[v] || f.name : f.name,
    }));
    // Auto-switch to Rules tab when cross_category is selected
    if (v === 'cross_category') setActiveTab('rules');
  };

  const isCrossCategory = editForm.match_type === 'cross_category';

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="mb-6"><AppHeader /></div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Product Carousels</h1>
              <p className="text-muted-foreground">Configure recommendation carousels shown on product pages</p>
            </div>
            <div className="flex gap-2">
              {carousels.length === 0 && (
                <Button variant="outline" onClick={() => installEssentials().then(() => toast({ title: 'Essentials installed' }))}>
                  <Sparkles className="w-4 h-4 mr-2" />Install Essentials
                </Button>
              )}
              <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />Add Carousel</Button>
            </div>
          </div>
        </header>

        {carousels.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No carousels configured yet</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => installEssentials().then(() => toast({ title: 'Essentials installed' }))}><Sparkles className="w-4 h-4 mr-2" />Install Essentials</Button>
              <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />Create Custom</Button>
            </div>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {carousels.map((carousel, idx) => {
              const isEditing = editingId === carousel.id;
              const matchLabel = MATCH_TYPES.find(m => m.value === carousel.match_type)?.label || carousel.match_type;
              const sizeLabel = CARD_SIZES.find(s => s.value === carousel.layout.card_size)?.label || carousel.layout.card_size;
              const stats = analytics[carousel.id];
              const ctr = stats ? ((stats.clicks / stats.views) * 100).toFixed(1) : null;

              return (
                <Card key={carousel.id} className={!carousel.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveCarousel(carousel.id, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                          <button onClick={() => moveCarousel(carousel.id, 'down')} disabled={idx === carousels.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                        </div>
                        {isEditing ? (
                          <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-lg font-semibold h-8 w-64" />
                        ) : (
                          <CardTitle className="text-lg">{carousel.name}</CardTitle>
                        )}
                        <Badge variant={carousel.is_active ? 'default' : 'secondary'}>{carousel.is_active ? 'Active' : 'Inactive'}</Badge>
                        {carousel.match_type === 'cross_category' && <Badge variant="outline" className="text-[10px]">Cross-Sell</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                            <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4 mr-1" />Save</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActive(carousel.id, carousel.is_active)}>
                              {carousel.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(carousel)}><Pencil className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(carousel.id)}><Trash2 className="w-4 h-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isEditing ? (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                          <TabsTrigger value="setup">Setup</TabsTrigger>
                          <TabsTrigger value="rules" className="relative">
                            Rules
                            {isCrossCategory && (
                              <span className="ml-1.5 w-2 h-2 rounded-full bg-primary inline-block" />
                            )}
                          </TabsTrigger>
                          <TabsTrigger value="display">Display</TabsTrigger>
                        </TabsList>

                        {/* ─── Setup Tab ─── */}
                        <TabsContent value="setup" className="space-y-4">
                          {isCrossCategory ? (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-lg">
                              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">⚡ Cross-Category Mode</p>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                Product recommendations are driven by the <strong>Rules tab</strong>. The settings below (Card Size, Max Items, Sort By) apply as defaults. Go to the Rules tab to configure which categories to cross-sell.
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                              💡 Match Type is the fallback when no rules from the Rules tab apply.
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Match Type</Label>
                              <Select value={editForm.match_type || 'category'} onValueChange={updateMatchType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MATCH_TYPE_GROUPS.map(group => {
                                    const items = MATCH_TYPES.filter(m => m.group === group);
                                    if (items.length === 0) return null;
                                    return (
                                      <div key={group}>
                                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                                        {items.map(m => (
                                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Card Size</Label>
                              <Select value={editForm.layout?.card_size || 'small'} onValueChange={v => setEditForm(f => ({ ...f, layout: { ...f.layout!, card_size: v as any } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{CARD_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Max Items</Label>
                              <Input type="number" min={1} max={50} value={editForm.match_config?.max_items || 12}
                                onChange={e => setEditForm(f => ({ ...f, match_config: { ...f.match_config, max_items: parseInt(e.target.value) || 12 } }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Sort By</Label>
                              <Select value={editForm.sort_by || 'newest'} onValueChange={v => setEditForm(f => ({ ...f, sort_by: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Target Category — hide for cross_category since rules define it */}
                          {!isCrossCategory && (
                            <div className="space-y-2">
                              <Label>Show products from category</Label>
                              <Select value={editForm.target_category || 'same'} onValueChange={v => setEditForm(f => ({ ...f, target_category: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="same">Same as current product</SelectItem>
                                  {TARGET_CATEGORIES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              {editForm.target_category && editForm.target_category !== 'same' && (
                                <p className="text-[10px] text-muted-foreground">Results will be filtered to {TARGET_CATEGORIES.find(t => t.value === editForm.target_category)?.label || editForm.target_category}, regardless of the viewed product's category.</p>
                              )}
                            </div>
                          )}

                          {/* Attribute Override (for attribute-based match types) */}
                          {!isCrossCategory && ['color', 'material', 'silhouette', 'heel_height', 'price_range'].includes(editForm.match_type || '') && (
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                                <ChevronDown className="w-3 h-3" />Attribute override
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3 space-y-3 pl-1">
                                <div className="flex items-center gap-2">
                                  <Switch checked={editForm.target_attribute_overrides?.enabled || false}
                                    onCheckedChange={v => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, enabled: v } }))} />
                                  <Label className="text-xs">Override attribute from current product</Label>
                                </div>
                                {editForm.target_attribute_overrides?.enabled && (
                                  <div className="space-y-3 bg-muted/30 rounded-md p-3">
                                    {editForm.match_type === 'color' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Always show color</Label>
                                        <Input className="h-8 text-xs" placeholder="e.g. Red, Black, Nude" value={editForm.target_attribute_overrides?.color || ''}
                                          onChange={e => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, color: e.target.value } }))} />
                                      </div>
                                    )}
                                    {editForm.match_type === 'material' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Always show material</Label>
                                        <Select value={editForm.target_attribute_overrides?.material || ''} onValueChange={v => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, material: v } }))}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select material" /></SelectTrigger>
                                          <SelectContent>
                                            {['Patent calf', 'Suede', 'Nappa leather', 'Silk taffeta', 'Satin', 'Glitter', 'Velvet', 'Canvas', 'Mesh'].map(m => (
                                              <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    {editForm.match_type === 'silhouette' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Always show silhouette</Label>
                                        <Select value={editForm.target_attribute_overrides?.silhouette_family || ''} onValueChange={v => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, silhouette_family: v } }))}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select silhouette" /></SelectTrigger>
                                          <SelectContent>
                                            {['Kate', 'So Kate', 'Miss Z', 'Cassia', 'Fanny', 'Jane', 'Hot Chick', 'Iriza', 'Vieira'].map(s => (
                                              <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    {editForm.match_type === 'heel_height' && (
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Target heel height (mm)</Label>
                                          <Input type="number" className="h-8 text-xs" placeholder="e.g. 100" value={editForm.target_attribute_overrides?.heel_height_mm || ''}
                                            onChange={e => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, heel_height_mm: parseInt(e.target.value) || undefined } }))} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Tolerance: ±{editForm.target_attribute_overrides?.tolerance || 20}mm</Label>
                                          <Slider min={10} max={50} step={5} value={[editForm.target_attribute_overrides?.tolerance || 20]}
                                            onValueChange={([v]) => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, tolerance: v } }))} />
                                        </div>
                                      </div>
                                    )}
                                    {editForm.match_type === 'price_range' && (
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Min price</Label>
                                          <Input type="number" className="h-8 text-xs" placeholder="e.g. 500" value={editForm.target_attribute_overrides?.price_min || ''}
                                            onChange={e => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, price_min: parseFloat(e.target.value) || undefined } }))} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Max price</Label>
                                          <Input type="number" className="h-8 text-xs" placeholder="e.g. 1500" value={editForm.target_attribute_overrides?.price_max || ''}
                                            onChange={e => setEditForm(f => ({ ...f, target_attribute_overrides: { ...f.target_attribute_overrides, price_max: parseFloat(e.target.value) || undefined } }))} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Match-type specific fields — hide for cross_category */}
                          {!isCrossCategory && editForm.match_type === 'category' && (
                            <div className="flex items-center gap-2">
                              <Switch checked={editForm.match_config?.fallback_to_collection ?? true}
                                onCheckedChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, fallback_to_collection: v } }))} />
                              <Label className="text-sm">Fallback to collection if no category matches</Label>
                            </div>
                          )}
                          {!isCrossCategory && editForm.match_type === 'heel_height' && (
                            <div className="space-y-2"><Label>Tolerance: ±{editForm.match_config?.tolerance || 20}mm</Label>
                              <Slider min={10} max={50} step={5} value={[editForm.match_config?.tolerance || 20]}
                                onValueChange={([v]) => setEditForm(f => ({ ...f, match_config: { ...f.match_config, tolerance: v } }))} /></div>
                          )}
                          {!isCrossCategory && editForm.match_type === 'price_range' && (
                            <div className="space-y-2"><Label>Tolerance: ±{editForm.match_config?.tolerance || 30}%</Label>
                              <Slider min={10} max={50} step={5} value={[editForm.match_config?.tolerance || 30]}
                                onValueChange={([v]) => setEditForm(f => ({ ...f, match_config: { ...f.match_config, tolerance: v } }))} /></div>
                          )}
                          {!isCrossCategory && editForm.match_type === 'ai_recommend' && (
                            <div className="space-y-3"><Label className="text-sm font-medium">AI Scoring Weights</Label>
                              {['category', 'color', 'price', 'style', 'popularity'].map(key => (
                                <div key={key} className="space-y-1">
                                  <div className="flex justify-between text-xs"><span className="capitalize">{key}</span><span>{editForm.match_config?.weights?.[key] ?? (key === 'category' ? 30 : key === 'color' ? 20 : key === 'price' ? 20 : 15)}</span></div>
                                  <Slider min={0} max={100} step={5}
                                    value={[editForm.match_config?.weights?.[key] ?? (key === 'category' ? 30 : key === 'color' ? 20 : key === 'price' ? 20 : 15)]}
                                    onValueChange={([v]) => setEditForm(f => ({ ...f, match_config: { ...f.match_config, weights: { ...(f.match_config?.weights || {}), [key]: v } } }))} />
                                </div>
                              ))}</div>
                          )}
                          {!isCrossCategory && editForm.match_type === 'complete_look' && (
                            <div className="space-y-2"><Label>Pairing Source</Label>
                              <Select value={editForm.match_config?.pairing_source || 'both'} onValueChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, pairing_source: v } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="compositions">Atelier Compositions</SelectItem>
                                  <SelectItem value="manual">Manual pairings</SelectItem>
                                  <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                              </Select></div>
                          )}
                          {!isCrossCategory && ['recently_viewed', 'customers_also_viewed', 'trending', 'new_arrivals'].includes(editForm.match_type || '') && (
                            <div className="space-y-2"><Label>Time Window</Label>
                              <Select value={editForm.match_config?.time_window || '7_days'} onValueChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, time_window: v } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="session">Current session</SelectItem>
                                  <SelectItem value="24h">Last 24 hours</SelectItem>
                                  <SelectItem value="7_days">Last 7 days</SelectItem>
                                  <SelectItem value="30_days">Last 30 days</SelectItem>
                                </SelectContent>
                              </Select></div>
                          )}
                        </TabsContent>

                        {/* ─── Rules Tab ─── */}
                        <TabsContent value="rules">
                          <CarouselRulesTab carouselId={carousel.id}
                            isCrossCategory={isCrossCategory}
                            fallbackBehavior={editForm.fallback_behavior || 'use_match_type'}
                            onFallbackChange={v => setEditForm(f => ({ ...f, fallback_behavior: v }))} />
                        </TabsContent>

                        {/* ─── Display Tab ─── */}
                        <TabsContent value="display" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Display Position</Label>
                              <Select value={editForm.display_position || 'below_product_info'} onValueChange={v => setEditForm(f => ({ ...f, display_position: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{DISPLAY_POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Min products to show</Label>
                              <Input type="number" min={1} max={20} value={editForm.min_products ?? 3}
                                onChange={e => setEditForm(f => ({ ...f, min_products: parseInt(e.target.value) || 3 }))} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Show on categories</Label>
                            <div className="flex gap-2 flex-wrap">
                              {CATEGORY_OPTIONS.map(cat => {
                                const selected = (editForm.show_on_categories || ['all']).includes(cat);
                                return (
                                  <Badge key={cat} variant={selected ? 'default' : 'outline'} className="cursor-pointer"
                                    onClick={() => setEditForm(f => {
                                      const current = f.show_on_categories || ['all'];
                                      if (cat === 'all') return { ...f, show_on_categories: ['all'] };
                                      const without = current.filter(c => c !== 'all' && c !== cat);
                                      return { ...f, show_on_categories: selected ? (without.length ? without : ['all']) : [...without, cat] };
                                    })}>
                                    {cat === 'all' ? 'All' : cat}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={editForm.exclude_current !== false} onCheckedChange={v => setEditForm(f => ({ ...f, exclude_current: v }))} />
                            <Label className="text-sm">Exclude current product</Label>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>Match: <strong className="text-foreground">{matchLabel}{carousel.target_category && carousel.target_category !== 'same' ? ` → ${TARGET_CATEGORIES.find(t => t.value === carousel.target_category)?.label || carousel.target_category}` : ''}</strong></span>
                        <span>Cards: <strong className="text-foreground">{sizeLabel}</strong></span>
                        <span>Max: <strong className="text-foreground">{carousel.match_config.max_items || 12}</strong></span>
                        <span>Position: <strong className="text-foreground">{DISPLAY_POSITIONS.find(p => p.value === carousel.display_position)?.label || 'Below info'}</strong></span>
                      </div>
                      {stats && (
                        <div className="flex gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                          <span>👁 {stats.views.toLocaleString()} views</span>
                          <span>🖱 {stats.clicks.toLocaleString()} clicks</span>
                          <span className="font-medium">{ctr}% CTR</span>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarouselSettingsPage;
