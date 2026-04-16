import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Eye, EyeOff, Pencil, Check, X, Sparkles, BarChart3, RefreshCw } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useCarouselDefinitions, CarouselDefinition } from '@/hooks/useProductCarousels';
import { supabase } from '@/integrations/supabase/client';

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

const TITLE_DEFAULTS: Record<string, string> = {
  category: 'Similar Products',
  collection: 'From the Collection',
  color: 'Same Color',
  manual: 'Our Picks',
  complete_look: 'Complete the Look',
  material: 'Same Material',
  silhouette: 'Same Silhouette',
  heel_height: 'Similar Heel Height',
  price_range: 'Similar Price',
  recently_viewed: 'Recently Viewed',
  customers_also_viewed: 'Customers Also Viewed',
  ai_recommend: 'You May Also Like',
  trending: 'Trending Now',
  new_arrivals: 'New Arrivals',
};

const CarouselSettingsPage = () => {
  const { carousels, loading, createCarousel, updateCarousel, deleteCarousel, refetch, installEssentials } = useCarouselDefinitions();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CarouselDefinition>>({});
  const [analytics, setAnalytics] = useState<Record<string, { views: number; clicks: number }>>({});

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data } = await supabase
        .from('recommendation_clicks')
        .select('carousel_id')
        .gte('clicked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (data) {
        const counts: Record<string, number> = {};
        for (const row of data) counts[row.carousel_id] = (counts[row.carousel_id] || 0) + 1;
        const result: Record<string, { views: number; clicks: number }> = {};
        for (const [id, clicks] of Object.entries(counts)) {
          result[id] = { views: Math.round(clicks / 0.077), clicks }; // Estimate views from CTR
        }
        setAnalytics(result);
      }
    };
    fetchAnalytics();
  }, [carousels]);

  const handleCreate = async () => {
    const result = await createCarousel({
      name: 'New Carousel',
      match_type: 'category',
      match_config: { fallback_to_collection: true, max_items: 12 },
      layout: { card_size: 'small', columns: 4 },
    });
    if (result.success) toast({ title: 'Carousel created' });
    else toast({ title: 'Failed', description: result.error, variant: 'destructive' });
  };

  const handleInstallEssentials = async () => {
    await installEssentials();
    toast({ title: 'Essential carousels installed' });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateCarousel(id, { is_active: !isActive } as any);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this carousel?')) return;
    const result = await deleteCarousel(id);
    if (result.success) toast({ title: 'Deleted' });
  };

  const startEdit = (c: CarouselDefinition) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      match_type: c.match_type,
      match_config: { ...c.match_config },
      layout: { ...c.layout },
      display_position: c.display_position,
      show_on_categories: [...c.show_on_categories],
      min_products: c.min_products,
      sort_by: c.sort_by,
      exclude_current: c.exclude_current,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await updateCarousel(editingId, editForm as any);
    if (result.success) { setEditingId(null); toast({ title: 'Updated' }); }
    else toast({ title: 'Failed', description: result.error, variant: 'destructive' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

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
      ...f,
      match_type: v,
      name: f.name === TITLE_DEFAULTS[f.match_type || ''] || f.name === 'New Carousel' ? TITLE_DEFAULTS[v] || f.name : f.name,
      match_config: {
        ...f.match_config,
        max_items: f.match_config?.max_items || 12,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
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
                <Button variant="outline" onClick={handleInstallEssentials}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Install Essentials
                </Button>
              )}
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Carousel
              </Button>
            </div>
          </div>
        </header>

        {carousels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No carousels configured yet</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleInstallEssentials}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Install Essential Carousels
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom
                </Button>
              </div>
            </CardContent>
          </Card>
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
                        <Badge variant={carousel.is_active ? 'default' : 'secondary'}>
                          {carousel.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {MATCH_TYPES.find(m => m.value === carousel.match_type)?.group === 'Smart' && (
                          <Badge variant="outline" className="text-[10px]">Smart</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                            <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4 mr-1" />Save</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleToggleActive(carousel.id, carousel.is_active)}>
                              {carousel.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(carousel)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(carousel.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isEditing ? (
                    <CardContent className="space-y-4">
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        {/* Match Type */}
                        <div className="space-y-2">
                          <Label>Match Type</Label>
                          <Select value={editForm.match_type || 'category'} onValueChange={updateMatchType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['Basic', 'Smart', 'Personalized', 'Dynamic'].map(group => (
                                <div key={group}>
                                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                                  {MATCH_TYPES.filter(m => m.group === group).map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Card Size */}
                        <div className="space-y-2">
                          <Label>Card Size</Label>
                          <Select value={editForm.layout?.card_size || 'small'} onValueChange={v => setEditForm(f => ({ ...f, layout: { ...f.layout!, card_size: v as any } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CARD_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Max Items */}
                        <div className="space-y-2">
                          <Label>Max Items</Label>
                          <Input type="number" min={1} max={50} value={editForm.match_config?.max_items || 12}
                            onChange={e => setEditForm(f => ({ ...f, match_config: { ...f.match_config, max_items: parseInt(e.target.value) || 12 } }))} />
                        </div>

                        {/* Min Products */}
                        <div className="space-y-2">
                          <Label>Min products to show</Label>
                          <Input type="number" min={1} max={20} value={editForm.min_products ?? 3}
                            onChange={e => setEditForm(f => ({ ...f, min_products: parseInt(e.target.value) || 3 }))} />
                        </div>

                        {/* Display Position */}
                        <div className="space-y-2">
                          <Label>Display Position</Label>
                          <Select value={editForm.display_position || 'below_product_info'} onValueChange={v => setEditForm(f => ({ ...f, display_position: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DISPLAY_POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sort By (for rule-based types) */}
                        {['category', 'collection', 'color', 'material', 'silhouette'].includes(editForm.match_type || '') && (
                          <div className="space-y-2">
                            <Label>Sort By</Label>
                            <Select value={editForm.sort_by || 'newest'} onValueChange={v => setEditForm(f => ({ ...f, sort_by: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Show on categories */}
                      <div className="space-y-2">
                        <Label>Show on categories</Label>
                        <div className="flex gap-2 flex-wrap">
                          {CATEGORY_OPTIONS.map(cat => {
                            const selected = (editForm.show_on_categories || ['all']).includes(cat);
                            return (
                              <Badge key={cat} variant={selected ? 'default' : 'outline'} className="cursor-pointer"
                                onClick={() => {
                                  setEditForm(f => {
                                    const current = f.show_on_categories || ['all'];
                                    if (cat === 'all') return { ...f, show_on_categories: ['all'] };
                                    const without = current.filter(c => c !== 'all' && c !== cat);
                                    return { ...f, show_on_categories: selected ? (without.length ? without : ['all']) : [...without, cat] };
                                  });
                                }}>
                                {cat === 'all' ? 'All' : cat}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Conditional fields */}
                      {/* Category fallback */}
                      {editForm.match_type === 'category' && (
                        <div className="flex items-center gap-2">
                          <Switch checked={editForm.match_config?.fallback_to_collection ?? true}
                            onCheckedChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, fallback_to_collection: v } }))} />
                          <Label className="text-sm">Fallback to collection if no category matches</Label>
                        </div>
                      )}

                      {/* Exclude current */}
                      {['category', 'collection', 'color', 'material', 'silhouette', 'heel_height', 'price_range'].includes(editForm.match_type || '') && (
                        <div className="flex items-center gap-2">
                          <Switch checked={editForm.exclude_current !== false}
                            onCheckedChange={v => setEditForm(f => ({ ...f, exclude_current: v }))} />
                          <Label className="text-sm">Exclude current product</Label>
                        </div>
                      )}

                      {/* Heel height tolerance */}
                      {editForm.match_type === 'heel_height' && (
                        <div className="space-y-2">
                          <Label>Tolerance: ±{editForm.match_config?.tolerance || 20}mm</Label>
                          <Slider min={10} max={50} step={5} value={[editForm.match_config?.tolerance || 20]}
                            onValueChange={([v]) => setEditForm(f => ({ ...f, match_config: { ...f.match_config, tolerance: v } }))} />
                        </div>
                      )}

                      {/* Price range tolerance */}
                      {editForm.match_type === 'price_range' && (
                        <div className="space-y-2">
                          <Label>Tolerance: ±{editForm.match_config?.tolerance || 30}%</Label>
                          <Slider min={10} max={50} step={5} value={[editForm.match_config?.tolerance || 30]}
                            onValueChange={([v]) => setEditForm(f => ({ ...f, match_config: { ...f.match_config, tolerance: v } }))} />
                        </div>
                      )}

                      {/* Time window */}
                      {['recently_viewed', 'customers_also_viewed', 'trending', 'new_arrivals'].includes(editForm.match_type || '') && (
                        <div className="space-y-2">
                          <Label>Time Window</Label>
                          <Select value={editForm.match_config?.time_window || '7_days'}
                            onValueChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, time_window: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="session">Current session</SelectItem>
                              <SelectItem value="24h">Last 24 hours</SelectItem>
                              <SelectItem value="7_days">Last 7 days</SelectItem>
                              <SelectItem value="30_days">Last 30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* AI weights */}
                      {editForm.match_type === 'ai_recommend' && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">AI Scoring Weights</Label>
                          {['category', 'color', 'price', 'style', 'popularity'].map(key => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="capitalize">{key}</span>
                                <span>{editForm.match_config?.weights?.[key] ?? (key === 'category' ? 30 : key === 'color' ? 20 : key === 'price' ? 20 : 15)}</span>
                              </div>
                              <Slider min={0} max={100} step={5}
                                value={[editForm.match_config?.weights?.[key] ?? (key === 'category' ? 30 : key === 'color' ? 20 : key === 'price' ? 20 : 15)]}
                                onValueChange={([v]) => setEditForm(f => ({
                                  ...f,
                                  match_config: {
                                    ...f.match_config,
                                    weights: { ...(f.match_config?.weights || {}), [key]: v },
                                  },
                                }))} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Complete the look source */}
                      {editForm.match_type === 'complete_look' && (
                        <div className="space-y-2">
                          <Label>Pairing Source</Label>
                          <Select value={editForm.match_config?.pairing_source || 'both'}
                            onValueChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, pairing_source: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compositions">Atelier Compositions</SelectItem>
                              <SelectItem value="manual">Manual pairings</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>Match: <strong className="text-foreground">{matchLabel}</strong></span>
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
