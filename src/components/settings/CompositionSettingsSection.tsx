import { useState, useEffect, useRef } from 'react';
import { Sparkles, Upload, X, Loader2, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompositionSettings {
  style: string;
  background: string;
  backgroundCustomColor: string;
  layout: string;
  customPrompt: string;
  referenceImages: string[];
}

const STYLE_PRESETS = [
  { value: 'editorial', label: 'Editorial Luxury', description: 'Vogue-style editorial still life' },
  { value: 'minimal', label: 'Minimal Flat Lay', description: 'Clean, minimal arrangement from above' },
  { value: 'classic', label: 'Classic Still Life', description: 'Traditional product photography' },
  { value: 'dramatic', label: 'Dramatic Chiaroscuro', description: 'Bold shadows, dramatic lighting' },
  { value: 'soft', label: 'Soft & Ethereal', description: 'Soft diffused light, dreamy feel' },
];

const BACKGROUND_OPTIONS = [
  { value: 'white', label: 'Pure White' },
  { value: 'cream', label: 'Warm Cream' },
  { value: 'marble', label: 'Marble Surface' },
  { value: 'dark', label: 'Dark/Black' },
  { value: 'gradient', label: 'Soft Gradient' },
  { value: 'custom', label: 'Custom Color' },
];

const LAYOUT_OPTIONS = [
  { value: 'balanced', label: 'Balanced Arrangement', description: 'Products evenly spaced' },
  { value: 'overlapping', label: 'Overlapping Layers', description: 'Products layered with depth' },
  { value: 'diagonal', label: 'Diagonal Flow', description: 'Products along a diagonal line' },
  { value: 'hero', label: 'Hero + Accent', description: 'One large product with smaller accents' },
];

const PRESET_REFERENCES = [
  {
    url: 'https://images.unsplash.com/photo-1556228578-0d85b1a83668?w=400',
    label: 'Flat Lay Beauty',
  },
  {
    url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    label: 'Luxury Cosmetics',
  },
  {
    url: 'https://images.unsplash.com/photo-1512207846876-bb54ef5056fe?w=400',
    label: 'Fashion Editorial',
  },
  {
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    label: 'Product Display',
  },
];

const DEFAULT_SETTINGS: CompositionSettings = {
  style: 'editorial',
  background: 'white',
  backgroundCustomColor: '#ffffff',
  layout: 'balanced',
  customPrompt: '',
  referenceImages: [],
};

const CompositionSettingsSection = () => {
  const [settings, setSettings] = useState<CompositionSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'composition_settings')
        .single();
      if (data?.value) {
        const val = data.value as Record<string, unknown>;
        setSettings({
          style: (val.style as string) || DEFAULT_SETTINGS.style,
          background: (val.background as string) || DEFAULT_SETTINGS.background,
          backgroundCustomColor: (val.backgroundCustomColor as string) || DEFAULT_SETTINGS.backgroundCustomColor,
          layout: (val.layout as string) || DEFAULT_SETTINGS.layout,
          customPrompt: (val.customPrompt as string) || DEFAULT_SETTINGS.customPrompt,
          referenceImages: (val.referenceImages as string[]) || [],
        });
      }
      setLoaded(true);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('app_settings').upsert({
        id: 'composition_settings',
        value: settings as any,
        updated_at: new Date().toISOString(),
      });
      toast.success('Composition settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadRef = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `compositions/refs/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('look-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('look-images').getPublicUrl(path);
      setSettings(prev => ({
        ...prev,
        referenceImages: [...prev.referenceImages, urlData.publicUrl],
      }));
      toast.success('Reference image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeRef = (index: number) => {
    setSettings(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index),
    }));
  };

  const addPresetRef = (url: string) => {
    if (settings.referenceImages.includes(url)) return;
    setSettings(prev => ({
      ...prev,
      referenceImages: [...prev.referenceImages, url],
    }));
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Atelier Compositions
        </CardTitle>
        <CardDescription>
          Control the AI-generated product composition style, layout, and visual references
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Style Preset */}
        <div className="space-y-2">
          <Label>Visual Style</Label>
          <Select value={settings.style} onValueChange={(v) => setSettings(prev => ({ ...prev, style: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLE_PRESETS.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <div>
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{s.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <Label>Background</Label>
          <Select value={settings.background} onValueChange={(v) => setSettings(prev => ({ ...prev, background: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BACKGROUND_OPTIONS.map(b => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settings.background === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={settings.backgroundCustomColor}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundCustomColor: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <Input
                value={settings.backgroundCustomColor}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundCustomColor: e.target.value }))}
                className="w-32"
              />
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="space-y-2">
          <Label>Product Layout</Label>
          <Select value={settings.layout} onValueChange={(v) => setSettings(prev => ({ ...prev, layout: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map(l => (
                <SelectItem key={l.value} value={l.value}>
                  <div>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{l.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Custom Prompt */}
        <div className="space-y-2">
          <Label>Custom Prompt (optional)</Label>
          <Textarea
            value={settings.customPrompt}
            onChange={(e) => setSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
            placeholder="Add additional instructions for the AI composition... e.g. 'Include soft shadows', 'Use a reflective surface', 'Art deco style framing'"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            These instructions will be appended to the base composition prompt
          </p>
        </div>

        <Separator />

        {/* Reference Images */}
        <div className="space-y-3">
          <Label>Reference Images</Label>
          <p className="text-xs text-muted-foreground">
            Upload or select reference images to guide the AI's composition style
          </p>

          {/* Current references */}
          {settings.referenceImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.referenceImages.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                  <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeRef(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadRef}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload Reference
            </Button>
          </div>

          {/* Preset gallery */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preset Styles</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_REFERENCES.map((preset, i) => {
                const isAdded = settings.referenceImages.includes(preset.url);
                return (
                  <button
                    key={i}
                    onClick={() => !isAdded && addPresetRef(preset.url)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      isAdded ? 'border-[hsl(var(--primary))] opacity-50' : 'border-transparent hover:border-[hsl(var(--primary))/50]'
                    }`}
                    disabled={isAdded}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    {!isAdded && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 text-[8px] text-white bg-black/60 text-center py-0.5 truncate">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Composition Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompositionSettingsSection;
