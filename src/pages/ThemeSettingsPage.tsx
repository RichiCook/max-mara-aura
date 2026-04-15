import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, Check } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ThemePalette {
  primary: string;
  background: string;
  foreground: string;
  accent: string;
  'muted-foreground': string;
  border: string;
  card: string;
  'ownership-bar': string;
  'passport-border': string;
}

const PRESETS: Record<string, { label: string; colors: ThemePalette }> = {
  louboutin: {
    label: 'Louboutin Classic',
    colors: {
      primary: '#E12B38', background: '#F7F3EF', foreground: '#1A1A1A',
      accent: '#C4A265', 'muted-foreground': '#737373', border: '#E5E0DC',
      card: '#FFFFFF', 'ownership-bar': '#E12B38', 'passport-border': '#C4A265',
    },
  },
  aura: {
    label: 'Aura Blockchain',
    colors: {
      primary: '#C4A265', background: '#1A1A1A', foreground: '#F7F3EF',
      accent: '#2DD4BF', 'muted-foreground': '#9CA3AF', border: '#374151',
      card: '#262626', 'ownership-bar': '#C4A265', 'passport-border': '#2DD4BF',
    },
  },
  noir: {
    label: 'Noir Minimal',
    colors: {
      primary: '#FFFFFF', background: '#0A0A0A', foreground: '#FAFAFA',
      accent: '#E12B38', 'muted-foreground': '#71717A', border: '#27272A',
      card: '#171717', 'ownership-bar': '#E12B38', 'passport-border': '#E12B38',
    },
  },
  creme: {
    label: 'Crème & Gold',
    colors: {
      primary: '#B8956A', background: '#FAF8F5', foreground: '#2C2420',
      accent: '#C4A265', 'muted-foreground': '#8C7E72', border: '#E8E0D8',
      card: '#FFFFFF', 'ownership-bar': '#B8956A', 'passport-border': '#C4A265',
    },
  },
};

const TOKEN_LABELS: Record<keyof ThemePalette, string> = {
  primary: 'Primary (CTA, buttons)',
  background: 'Background',
  foreground: 'Text color',
  accent: 'Accent (gold/highlights)',
  'muted-foreground': 'Muted text',
  border: 'Borders & dividers',
  card: 'Card background',
  'ownership-bar': 'Ownership bar',
  'passport-border': 'Passport card border',
};

const hexToHSL = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const ThemeSettingsPage = () => {
  const { toast } = useToast();
  const [colors, setColors] = useState<ThemePalette>(PRESETS.louboutin.colors);
  const [activePreset, setActivePreset] = useState<string>('louboutin');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'theme_palette').single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as any;
          if (val.colors) setColors(val.colors);
          setActivePreset(val.preset || 'custom');
        }
      });
  }, []);

  const handlePresetChange = (key: string) => {
    if (PRESETS[key]) {
      setColors(PRESETS[key].colors);
      setActivePreset(key);
    }
  };

  const handleColorChange = (token: keyof ThemePalette, value: string) => {
    setColors(prev => ({ ...prev, [token]: value }));
    setActivePreset('custom');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('app_settings').upsert({
        id: 'theme_palette',
        value: { preset: activePreset, colors } as any,
        updated_at: new Date().toISOString(),
      });

      // Apply to CSS custom properties immediately
      const root = document.documentElement;
      const mappings: Record<string, string> = {
        primary: '--primary',
        background: '--background',
        foreground: '--foreground',
        accent: '--accent',
        'muted-foreground': '--muted-foreground',
        border: '--border',
        card: '--card',
        'ownership-bar': '--louboutin-red',
        'passport-border': '--aura-gold',
      };
      Object.entries(mappings).forEach(([token, cssVar]) => {
        const hex = colors[token as keyof ThemePalette];
        if (cssVar.startsWith('--louboutin') || cssVar.startsWith('--aura')) {
          root.style.setProperty(cssVar, hex);
        } else {
          const hsl = hexToHSL(hex);
          if (hsl) root.style.setProperty(cssVar, hsl);
        }
      });

      toast({ title: 'Theme saved!' });
    } catch {
      toast({ title: 'Failed to save theme', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="mb-6"><AppHeader /></div>
          <div className="flex items-center gap-3 mb-2">
            <Button asChild variant="ghost" size="icon">
              <Link to="/settings"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <h1 className="text-2xl font-semibold">Theme Settings</h1>
          </div>
          <p className="text-muted-foreground ml-12">Customize the product page color palette</p>
        </header>

        <div className="space-y-6">
          {/* Preset Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Palette
              </CardTitle>
              <CardDescription>Choose a preset or customize individual colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Preset</Label>
                <Select value={activePreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                    ))}
                    {activePreset === 'custom' && <SelectItem value="custom">Custom</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Preset cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className="relative rounded-lg border-2 p-3 text-left transition-colors"
                    style={{
                      borderColor: activePreset === key ? preset.colors.primary : 'hsl(var(--border))',
                      background: preset.colors.background,
                    }}
                  >
                    {activePreset === key && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: preset.colors.primary }}>
                        <Check className="w-3 h-3" style={{ color: preset.colors.background }} />
                      </div>
                    )}
                    <div className="flex gap-1 mb-2">
                      {[preset.colors.primary, preset.colors.accent, preset.colors.foreground].map((c, i) => (
                        <span key={i} className="w-4 h-4 rounded-full border" style={{ background: c, borderColor: preset.colors.border }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: preset.colors.foreground }}>{preset.label}</p>
                  </button>
                ))}
              </div>

              {/* Individual Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                {(Object.keys(TOKEN_LABELS) as (keyof ThemePalette)[]).map(token => (
                  <div key={token} className="space-y-1.5">
                    <Label className="text-xs">{TOKEN_LABELS[token]}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors[token]}
                        onChange={e => handleColorChange(token, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <Input
                        value={colors[token]}
                        onChange={e => handleColorChange(token, e.target.value)}
                        className="flex-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border" style={{ background: colors.background }}>
                {/* Ownership bar */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: colors['ownership-bar'], color: '#fff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-semibold">View ownership status</span>
                </div>

                {/* Product card */}
                <div className="p-4" style={{ background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#166534' }}>✓ Genuine</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>⬡ Certified</span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold" style={{ color: colors.foreground }}>So Kate 120mm</h3>
                  <p className="text-xs mt-1" style={{ color: colors['muted-foreground'] }}>Made in Italy · Iconic</p>
                </div>

                {/* Passport card */}
                <div className="m-3 p-3 rounded-lg" style={{ border: `1.5px solid ${colors['passport-border']}`, background: colors.card }}>
                  <span className="text-sm font-semibold" style={{ color: colors.foreground }}>Digital Passport Available</span>
                  <p className="text-xs mt-0.5" style={{ color: colors['passport-border'] }}>Aura Blockchain Consortium</p>
                </div>

                {/* CTA Button */}
                <div className="p-4">
                  <button className="w-full py-3 rounded-lg text-sm font-semibold" style={{ background: colors.primary, color: '#fff' }}>
                    View on our Store
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Save Theme'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPage;
