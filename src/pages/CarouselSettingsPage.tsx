import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCarouselDefinitions, CarouselDefinition } from '@/hooks/useProductCarousels';
import { supabase } from '@/integrations/supabase/client';

const MATCH_TYPES = [
  { value: 'category', label: 'Same Category' },
  { value: 'collection', label: 'Same Collection' },
  { value: 'color', label: 'Same Color' },
  { value: 'manual', label: 'Manual Picks' },
];

const CARD_SIZES = [
  { value: 'small', label: 'Small (148px)' },
  { value: 'medium', label: 'Medium (180px)' },
  { value: 'large', label: 'Large (240px)' },
];

const CarouselSettingsPage = () => {
  const { carousels, loading, createCarousel, updateCarousel, deleteCarousel, refetch } = useCarouselDefinitions();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CarouselDefinition>>({});

  const handleCreate = async () => {
    const result = await createCarousel({
      name: 'New Carousel',
      match_type: 'category',
      match_config: { fallback_to_collection: true, max_items: 12 },
      layout: { card_size: 'small', columns: 4 },
    });
    if (result.success) {
      toast({ title: 'Carousel created' });
    } else {
      toast({ title: 'Failed to create', description: result.error, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateCarousel(id, { is_active: !isActive });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this carousel? This cannot be undone.')) return;
    const result = await deleteCarousel(id);
    if (result.success) {
      toast({ title: 'Carousel deleted' });
    }
  };

  const startEdit = (carousel: CarouselDefinition) => {
    setEditingId(carousel.id);
    setEditForm({
      name: carousel.name,
      match_type: carousel.match_type,
      match_config: { ...carousel.match_config },
      layout: { ...carousel.layout },
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await updateCarousel(editingId, editForm as any);
    if (result.success) {
      setEditingId(null);
      toast({ title: 'Carousel updated' });
    } else {
      toast({ title: 'Failed to update', description: result.error, variant: 'destructive' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const moveCarousel = async (id: string, direction: 'up' | 'down') => {
    const idx = carousels.findIndex(c => c.id === id);
    if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= carousels.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const currentOrder = carousels[idx].display_order;
    const swapOrder = carousels[swapIdx].display_order;
    await Promise.all([
      updateCarousel(carousels[idx].id, { display_order: swapOrder } as any),
      updateCarousel(carousels[swapIdx].id, { display_order: currentOrder } as any),
    ]);
    refetch();
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
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Carousel
            </Button>
          </div>
        </header>

        {carousels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No carousels configured yet</p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first carousel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {carousels.map((carousel, idx) => {
              const isEditing = editingId === carousel.id;
              const matchLabel = MATCH_TYPES.find(m => m.value === carousel.match_type)?.label || carousel.match_type;
              const sizeLabel = CARD_SIZES.find(s => s.value === carousel.layout.card_size)?.label || carousel.layout.card_size;

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
                          <Input
                            value={editForm.name || ''}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="text-lg font-semibold h-8 w-64"
                          />
                        ) : (
                          <CardTitle className="text-lg">{carousel.name}</CardTitle>
                        )}
                        <Badge variant={carousel.is_active ? 'default' : 'secondary'}>
                          {carousel.is_active ? 'Active' : 'Inactive'}
                        </Badge>
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
                        <div className="space-y-2">
                          <Label>Match Type</Label>
                          <Select
                            value={editForm.match_type || 'category'}
                            onValueChange={v => setEditForm(f => ({ ...f, match_type: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MATCH_TYPES.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Card Size</Label>
                          <Select
                            value={editForm.layout?.card_size || 'small'}
                            onValueChange={v => setEditForm(f => ({ ...f, layout: { ...f.layout!, card_size: v as any } }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CARD_SIZES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Max Items</Label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={editForm.match_config?.max_items || 12}
                            onChange={e => setEditForm(f => ({ ...f, match_config: { ...f.match_config, max_items: parseInt(e.target.value) || 12 } }))}
                          />
                        </div>

                        {(editForm.match_type === 'category') && (
                          <div className="flex items-center gap-2 pt-6">
                            <Switch
                              checked={editForm.match_config?.fallback_to_collection ?? true}
                              onCheckedChange={v => setEditForm(f => ({ ...f, match_config: { ...f.match_config, fallback_to_collection: v } }))}
                            />
                            <Label className="text-sm">Fallback to collection</Label>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Match: <strong className="text-foreground">{matchLabel}</strong></span>
                        <span>Cards: <strong className="text-foreground">{sizeLabel}</strong></span>
                        <span>Max: <strong className="text-foreground">{carousel.match_config.max_items || 12}</strong></span>
                      </div>
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
