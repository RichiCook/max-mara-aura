import { useState, useEffect } from 'react';
import { ArrowRight, Plus, Trash2, Loader2, Pencil, Check, X, Sparkles, Link2, CheckCircle, Clock, Pause, Send, Eye, History } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDependenceRules, DependenceRule, AuditLogEntry } from '@/hooks/useDependenceRules';

const CATEGORIES = ['shoes', 'bags', 'small_leather_goods', 'accessories', 'eyewear', 'beauty'];
const CATEGORY_LABELS: Record<string, string> = {
  shoes: 'Shoes', bags: 'Bags', small_leather_goods: 'Small Leather Goods',
  accessories: 'Accessories', eyewear: 'Eyewear', beauty: 'Beauty & Fragrance',
};

const MATCH_DIMENSIONS = [
  { value: 'color', label: 'Color' },
  { value: 'collection', label: 'Collection / Season' },
  { value: 'material', label: 'Material' },
  { value: 'price_tier', label: 'Price Tier' },
  { value: 'gender', label: 'Gender' },
  { value: 'style_mood', label: 'Style Mood' },
  { value: 'occasion', label: 'Occasion' },
  { value: 'manual_pairing', label: 'Manual (Atelier)' },
];

const SORT_OPTIONS = [
  { value: 'best_sellers', label: 'Best Sellers' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_desc', label: 'Highest Price' },
  { value: 'random', label: 'Random' },
];

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  pending_review: { variant: 'outline', label: 'Pending Review' },
  approved: { variant: 'default', label: 'Approved' },
  paused: { variant: 'secondary', label: 'Paused' },
};

const DependenceRulesPage = () => {
  const {
    rules, loading, createRule, updateRule, deleteRule,
    submitForReview, approveRule, sendBackToDraft, pauseRule,
    fetchAuditLog, seedDefaultRules,
  } = useDependenceRules();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DependenceRule>>({});
  const [reviewModal, setReviewModal] = useState<DependenceRule | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [auditModal, setAuditModal] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && rules.length === 0) setShowOnboarding(true);
  }, [loading, rules.length]);

  const handleCreate = async () => {
    const result = await createRule({
      name: 'New Rule',
      trigger_categories: ['shoes'],
      target_category: 'bags',
      match_dimensions: ['color'],
    });
    if (result.success) toast({ title: 'Rule created as draft' });
  };

  const handleSeedDefaults = async () => {
    await seedDefaultRules();
    setShowOnboarding(false);
    toast({ title: '7 example rules created as drafts' });
  };

  const startEdit = (rule: DependenceRule) => {
    setEditingId(rule.id);
    setEditForm({ ...rule, trigger_filters: { ...rule.trigger_filters }, target_attribute_overrides: { ...rule.target_attribute_overrides } });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const result = await updateRule(editingId, editForm as any);
    if (result.success) { setEditingId(null); toast({ title: 'Rule updated' }); }
  };

  const openAudit = async (ruleId: string) => {
    setAuditModal(ruleId);
    const log = await fetchAuditLog(ruleId);
    setAuditLog(log);
  };

  const handleReview = async (approve: boolean) => {
    if (!reviewModal) return;
    if (approve) {
      await approveRule(reviewModal.id, reviewNotes || undefined);
      toast({ title: 'Rule approved and activated' });
    } else {
      await sendBackToDraft(reviewModal.id, reviewNotes || undefined);
      toast({ title: 'Sent back to draft' });
    }
    setReviewModal(null);
    setReviewNotes('');
  };

  const moveRule = async (id: string, direction: 'up' | 'down') => {
    const idx = rules.findIndex(r => r.id === id);
    if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= rules.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    await Promise.all([
      updateRule(rules[idx].id, { priority: rules[swapIdx].priority } as any),
      updateRule(rules[swapIdx].id, { priority: rules[idx].priority } as any),
    ]);
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
              <h1 className="text-2xl font-semibold">Global Dependence Rules</h1>
              <p className="text-muted-foreground">Define how product categories recommend each other across the site</p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </div>
        </header>

        {/* Onboarding */}
        {showOnboarding && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Sparkles className="w-8 h-8 text-primary shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Get started faster</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    We've prepared 7 example rules based on common fashion cross-sell patterns. Review and approve the ones you want.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleSeedDefaults}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Install Example Rules
                    </Button>
                    <Button variant="ghost" onClick={() => setShowOnboarding(false)}>Skip</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {rules.length === 0 && !showOnboarding ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No dependence rules configured yet</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowOnboarding(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Example Rules
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, idx) => {
              const isEditing = editingId === rule.id;
              const statusStyle = STATUS_STYLES[rule.status] || STATUS_STYLES.draft;

              return (
                <Card key={rule.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveRule(rule.id, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                          <button onClick={() => moveRule(rule.id, 'down')} disabled={idx === rules.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                        </div>
                        {isEditing ? (
                          <Input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-lg font-semibold h-8 w-64" />
                        ) : (
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                        )}
                        <Badge variant={statusStyle.variant} className={rule.status === 'pending_review' ? 'bg-amber-100 text-amber-800 border-amber-300' : rule.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' : ''}>
                          {statusStyle.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <>
                            {rule.status === 'draft' && (
                              <Button size="sm" variant="outline" onClick={() => submitForReview(rule.id)}>
                                <Send className="w-3.5 h-3.5 mr-1" />Submit
                              </Button>
                            )}
                            {rule.status === 'pending_review' && (
                              <Button size="sm" onClick={() => { setReviewModal(rule); setReviewNotes(''); }}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Review
                              </Button>
                            )}
                            {rule.status === 'approved' && (
                              <Button size="sm" variant="ghost" onClick={() => pauseRule(rule.id)}>
                                <Pause className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => openAudit(rule.id)}>
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(rule)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this rule?')) deleteRule(rule.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                            <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4 mr-1" />Save</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isEditing ? (
                    <CardContent className="space-y-4">
                      <Separator />
                      {/* Description */}
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Trigger categories */}
                        <div className="space-y-2">
                          <Label>When viewing products in</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {CATEGORIES.map(cat => {
                              const sel = (editForm.trigger_categories || []).includes(cat);
                              return (
                                <Badge key={cat} variant={sel ? 'default' : 'outline'} className="cursor-pointer text-xs"
                                  onClick={() => setEditForm(f => ({
                                    ...f,
                                    trigger_categories: sel
                                      ? (f.trigger_categories || []).filter(c => c !== cat)
                                      : [...(f.trigger_categories || []), cat],
                                  }))}>
                                  {CATEGORY_LABELS[cat]}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Target category */}
                        <div className="space-y-2">
                          <Label>Show products from</Label>
                          <Select value={editForm.target_category || 'bags'} onValueChange={v => setEditForm(f => ({ ...f, target_category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Match dimensions */}
                        <div className="space-y-2 col-span-2">
                          <Label>Match by</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {MATCH_DIMENSIONS.map(dim => {
                              const sel = (editForm.match_dimensions || []).includes(dim.value);
                              return (
                                <Badge key={dim.value} variant={sel ? 'default' : 'outline'} className="cursor-pointer text-xs"
                                  onClick={() => setEditForm(f => ({
                                    ...f,
                                    match_dimensions: sel
                                      ? (f.match_dimensions || []).filter(d => d !== dim.value)
                                      : [...(f.match_dimensions || []), dim.value],
                                  }))}>
                                  {dim.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Max results */}
                        <div className="space-y-2">
                          <Label>Max Results</Label>
                          <Input type="number" min={1} max={24} value={editForm.max_results ?? 8}
                            onChange={e => setEditForm(f => ({ ...f, max_results: parseInt(e.target.value) || 8 }))} />
                        </div>

                        {/* Sort by */}
                        <div className="space-y-2">
                          <Label>Sort By</Label>
                          <Select value={editForm.sort_by || 'best_sellers'} onValueChange={v => setEditForm(f => ({ ...f, sort_by: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                          <Label>Priority (lower = higher)</Label>
                          <Input type="number" min={1} value={editForm.priority ?? 10}
                            onChange={e => setEditForm(f => ({ ...f, priority: parseInt(e.target.value) || 10 }))} />
                        </div>

                        {/* Trigger filters: gender */}
                        <div className="space-y-2">
                          <Label>Gender filter (trigger)</Label>
                          <Select value={editForm.trigger_filters?.gender || 'any'} onValueChange={v => setEditForm(f => ({ ...f, trigger_filters: { ...f.trigger_filters, gender: v === 'any' ? undefined : v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any</SelectItem>
                              <SelectItem value="women">Women</SelectItem>
                              <SelectItem value="men">Men</SelectItem>
                              <SelectItem value="unisex">Unisex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-0">
                      {/* Arrow visualization */}
                      <div className="flex items-center gap-2 mb-2">
                        {rule.trigger_categories.map(cat => (
                          <Badge key={cat} variant="outline" className="text-xs bg-muted">{CATEGORY_LABELS[cat] || cat}</Badge>
                        ))}
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          {CATEGORY_LABELS[rule.target_category] || rule.target_category}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                        <span>Match: <strong className="text-foreground">{rule.match_dimensions.map(d => MATCH_DIMENSIONS.find(m => m.value === d)?.label || d).join(', ')}</strong></span>
                        <span>Max: <strong className="text-foreground">{rule.max_results}</strong></span>
                        <span>Priority: <strong className="text-foreground">{rule.priority}</strong></span>
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mt-1.5">{rule.description}</p>}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={!!reviewModal} onOpenChange={() => setReviewModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Rule</DialogTitle>
            <DialogDescription>Review and approve or send back to draft</DialogDescription>
          </DialogHeader>
          {reviewModal && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{reviewModal.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  {reviewModal.trigger_categories.map(c => (
                    <Badge key={c} variant="outline" className="text-xs">{CATEGORY_LABELS[c] || c}</Badge>
                  ))}
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[reviewModal.target_category] || reviewModal.target_category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Match by: {reviewModal.match_dimensions.join(', ')} · Max: {reviewModal.max_results}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add reviewer notes..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleReview(false)}>Send Back to Draft</Button>
            <Button onClick={() => handleReview(true)}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Modal */}
      <Dialog open={!!auditModal} onOpenChange={() => setAuditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Log</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No log entries</p>
            ) : auditLog.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.performed_at).toLocaleString()}
                  </p>
                  {entry.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{entry.notes}"</p>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DependenceRulesPage;
