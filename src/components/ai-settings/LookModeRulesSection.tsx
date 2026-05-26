import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchLookModeRules,
  saveLookModeRules,
  DEFAULT_LOOK_MODE_RULES,
  type LookModeRules,
} from '@/lib/lookMode';

export const LookModeRulesSection = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<LookModeRules>(DEFAULT_LOOK_MODE_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLookModeRules().then(r => { setRules(r); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLookModeRules(rules);
      toast({ title: 'Look mode rules saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Look Mode Rules
        </CardTitle>
        <CardDescription>
          Decide whether each AI-curated look opens as a Photo (model wearing the outfit) or a Collage (flat-lay of the products).
          Users can always switch between the two and generate the other on demand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Selection rule</Label>
          <Select
            value={rules.rule}
            onValueChange={(v) => setRules({ ...rules, rule: v as LookModeRules['rule'] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="category_mix">By category mix (apparel → Photo, accessories-only → Collage)</SelectItem>
              <SelectItem value="product_count">By product count</SelectItem>
              <SelectItem value="fixed">Always use a fixed mode</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rules.rule === 'fixed' && (
          <div className="space-y-2">
            <Label>Fixed default mode</Label>
            <Select
              value={rules.default_mode === 'collage' ? 'collage' : 'photo'}
              onValueChange={(v) => setRules({ ...rules, default_mode: v as 'photo' | 'collage' })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo (on model)</SelectItem>
                <SelectItem value="collage">Collage (flat-lay)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {rules.rule === 'category_mix' && (
          <div className="space-y-2">
            <Label>Apparel categories (comma-separated)</Label>
            <Input
              value={rules.apparel_categories.join(', ')}
              onChange={(e) =>
                setRules({
                  ...rules,
                  apparel_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })
              }
              placeholder="dress, coat, top, skirt, pants, suit, jacket"
            />
            <p className="text-xs text-muted-foreground">
              If a look contains any of these categories → Photo. Otherwise → Collage.
            </p>
          </div>
        )}

        {rules.rule === 'product_count' && (
          <div className="space-y-2">
            <Label>Photo threshold (number of products)</Label>
            <Input
              type="number"
              min={2}
              value={rules.count_threshold}
              onChange={(e) => setRules({ ...rules, count_threshold: Math.max(2, parseInt(e.target.value) || 4) })}
            />
            <p className="text-xs text-muted-foreground">
              Looks with at least this many products → Photo. Fewer → Collage.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save rules'}
        </Button>
      </CardContent>
    </Card>
  );
};
