import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Palette, Type, Image, Save, Loader2, User, X, Tag, Wrench, ShoppingBag, ExternalLink, Trash2 } from 'lucide-react';
import RepairServiceSettings from '@/components/repair/RepairServiceSettings';
import CompositionSettingsSection from '@/components/settings/CompositionSettingsSection';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { invalidateProductLinkCache } from '@/hooks/useProductLinkDestination';
import defaultLogo from '@/assets/logo.png';

const SettingsPage = () => {
  const { settings, loading, saving, updateSettings, uploadLogo, uploadFavicon } = usePlatformSettings();
  const { refetch: refetchContext } = usePlatformSettingsContext();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const modelRefInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState('');
  const [modelReferenceImage, setModelReferenceImage] = useState<string | null>(null);
  const [uploadingModelRef, setUploadingModelRef] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#f5f5f5');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [resaleSharingEnabled, setResaleSharingEnabled] = useState(false);
  const [productLinkDest, setProductLinkDest] = useState<'platform' | 'brand_website'>('platform');
  const [shopifyEnabled, setShopifyEnabled] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [shopifyEmbed, setShopifyEmbed] = useState(true);
  const [logoHeight, setLogoHeight] = useState(32);
  const [logoPosition, setLogoPosition] = useState<'left' | 'center'>('left');
  const [productPageVersion, setProductPageVersion] = useState<'classic' | 'editorial'>('classic');

  // Load product page version
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'product_page_version').single()
      .then(({ data }) => {
        const v = (data?.value as { version?: string } | null)?.version;
        if (v === 'editorial' || v === 'classic') setProductPageVersion(v);
      });
  }, []);

  const handleProductPageVersionToggle = async (useEditorial: boolean) => {
    const version = useEditorial ? 'editorial' : 'classic';
    setProductPageVersion(version);
    try {
      await supabase.from('app_settings').upsert({
        id: 'product_page_version',
        value: { version } as any,
        updated_at: new Date().toISOString(),
      });
      toast({ title: useEditorial ? 'Product page → Editorial' : 'Product page → Classic' });
    } catch {
      toast({ title: 'Failed to update setting', variant: 'destructive' });
      setProductPageVersion(useEditorial ? 'classic' : 'editorial');
    }
  };

  // Load logo display settings
  useEffect(() => {
    const fetchLogoDisplay = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'logo_display')
        .single();
      if (data?.value) {
        const val = data.value as { height?: number; position?: string };
        setLogoHeight(val.height ?? 32);
        setLogoPosition((val.position as 'left' | 'center') ?? 'left');
      }
    };
    fetchLogoDisplay();
  }, []);

  // Sync state when settings load
  useEffect(() => {
    if (!loading) {
      setBrandName(settings.brand_name);
      setPageTitle(settings.page_title || '');
      setPrimaryColor(settings.primary_color);
      setSecondaryColor(settings.secondary_color);
      setAccentColor(settings.accent_color);
    }
  }, [settings, loading]);

  // Load resale sharing setting
  useEffect(() => {
    const fetchResaleSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'resale_sharing_enabled')
        .single();
      if (data?.value) {
        const val = data.value as { enabled?: boolean };
        setResaleSharingEnabled(val.enabled ?? false);
      }
    };
    fetchResaleSetting();
  }, []);

  // Load product link destination
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'product_link_destination').single()
      .then(({ data }) => {
        if (data?.value) {
          const val = (data.value as { destination?: string }).destination;
          if (val === 'brand_website' || val === 'platform') setProductLinkDest(val);
        }
      });
  }, []);

  // Load Shopify config
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('id', 'shopify_config').single()
      .then(({ data }) => {
        if (data?.value) {
          const val = data.value as any;
          setShopifyEnabled(val.enabled ?? false);
          setShopifyDomain(val.domain ?? '');
          setShopifyToken(val.storefrontToken ?? '');
          setShopifyEmbed(val.embedCheckout ?? true);
        }
      });
  }, []);

  // Load model reference image from app_settings
  useEffect(() => {
    const fetchModelRef = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'model_reference_image')
        .single();
      
      if (data?.value) {
        const value = data.value as { url?: string };
        setModelReferenceImage(value.url || null);
      }
    };
    fetchModelRef();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await uploadLogo(file);
    if (error) {
      toast({ title: 'Upload failed', description: error, variant: 'destructive' });
      return;
    }

    const result = await updateSettings({ logo_url: url });
    if (result.success) {
      await refetchContext();
      toast({ title: 'Logo updated!' });
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { url, error } = await uploadFavicon(file);
    if (error) {
      toast({ title: 'Upload failed', description: error, variant: 'destructive' });
      return;
    }

    const result = await updateSettings({ favicon_url: url });
    if (result.success) {
      await refetchContext();
      toast({ title: 'Favicon updated!' });
    }
  };

  const handleModelRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingModelRef(true);
    try {
      // Upload to branding bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `model-reference.${fileExt}`;
      const filePath = `model/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const url = urlData.publicUrl;

      // Save to app_settings
      await supabase
        .from('app_settings')
        .upsert({ 
          id: 'model_reference_image', 
          value: { url },
          updated_at: new Date().toISOString()
        });

      setModelReferenceImage(url);
      toast({ title: 'Model reference uploaded!' });
    } catch (err: any) {
      toast({ 
        title: 'Upload failed', 
        description: err.message, 
        variant: 'destructive' 
      });
    } finally {
      setUploadingModelRef(false);
    }
  };

  const handleRemoveModelRef = async () => {
    try {
      await supabase
        .from('app_settings')
        .delete()
        .eq('id', 'model_reference_image');

      setModelReferenceImage(null);
      toast({ title: 'Model reference removed' });
    } catch (err: any) {
      toast({ 
        title: 'Failed to remove', 
        description: err.message, 
        variant: 'destructive' 
      });
    }
  };

  const handleResaleSharingToggle = async (enabled: boolean) => {
    setResaleSharingEnabled(enabled);
    try {
      await supabase
        .from('app_settings')
        .upsert({
          id: 'resale_sharing_enabled',
          value: { enabled } as any,
          updated_at: new Date().toISOString(),
        });
      toast({ title: enabled ? 'Resale sharing enabled' : 'Resale sharing disabled' });
    } catch {
      toast({ title: 'Failed to update setting', variant: 'destructive' });
      setResaleSharingEnabled(!enabled);
    }
  };

  const handleProductLinkDestToggle = async (useBrandWebsite: boolean) => {
    const dest = useBrandWebsite ? 'brand_website' : 'platform';
    setProductLinkDest(dest);
    invalidateProductLinkCache();
    try {
      await supabase.from('app_settings').upsert({
        id: 'product_link_destination',
        value: { destination: dest } as any,
        updated_at: new Date().toISOString(),
      });
      toast({ title: useBrandWebsite ? 'Product links → Brand website' : 'Product links → Platform pages' });
    } catch {
      toast({ title: 'Failed to update setting', variant: 'destructive' });
      setProductLinkDest(useBrandWebsite ? 'platform' : 'brand_website');
    }
  };

  const handleShopifySave = async () => {
    try {
      await supabase.from('app_settings').upsert({
        id: 'shopify_config',
        value: { enabled: shopifyEnabled, domain: shopifyDomain, storefrontToken: shopifyToken, embedCheckout: shopifyEmbed } as any,
        updated_at: new Date().toISOString(),
      });
      toast({ title: 'Shopify settings saved' });
    } catch {
      toast({ title: 'Failed to save Shopify settings', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    const result = await updateSettings({
      brand_name: brandName,
      page_title: pageTitle,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
    });

    if (result.success) {
      await refetchContext();
      toast({ title: 'Settings saved!' });
    } else {
      toast({ title: 'Failed to save', description: result.error, variant: 'destructive' });
    }
  };

  const logoUrl = settings.logo_url || defaultLogo;

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
        {/* Header */}
        <header className="mb-8">
          <div className="mb-6">
            <AppHeader />
          </div>
          <h1 className="text-2xl font-semibold">Platform Settings</h1>
          <p className="text-muted-foreground">Customize your platform appearance</p>
        </header>

        <div className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>Logo, favicon, and brand name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Your brand name"
                />
              </div>

              {/* Page Title */}
              <div className="space-y-2">
                <Label htmlFor="pageTitle">Browser Tab Title</Label>
                <Input
                  id="pageTitle"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Browser tab title"
                />
                <p className="text-xs text-muted-foreground">
                  This appears in the browser tab
                </p>
              </div>

              <Separator />

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted/50">
                    {settings.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 200x50px, PNG or SVG
                    </p>
                  </div>
                </div>

                {/* Logo Size */}
                <div className="mt-4 space-y-2">
                  <Label>Logo Size ({logoHeight}px)</Label>
                  <input
                    type="range"
                    min={16}
                    max={80}
                    value={logoHeight}
                    onChange={(e) => setLogoHeight(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>16px</span>
                    <span>80px</span>
                  </div>
                </div>

                {/* Logo Position */}
                <div className="mt-2 space-y-2">
                  <Label>Logo Position</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={logoPosition === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogoPosition('left')}
                    >
                      Left
                    </Button>
                    <Button
                      variant={logoPosition === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogoPosition('center')}
                    >
                      Center
                    </Button>
                  </div>
                </div>

                {/* Logo Preview */}
                <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground mb-2">Preview</p>
                  <div className={`flex items-center ${logoPosition === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <img
                      src={settings.logo_url || defaultLogo}
                      alt="Logo preview"
                      style={{ height: logoHeight }}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Save Logo Display */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await supabase
                      .from('app_settings')
                      .upsert({
                        id: 'logo_display',
                        value: { height: logoHeight, position: logoPosition },
                        updated_at: new Date().toISOString(),
                      });
                    toast({ title: 'Logo display settings saved!' });
                  }}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Logo Settings
                </Button>
              </div>

              <Separator />

              {/* Favicon */}
              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted/50">
                    {settings.favicon_url ? (
                      <img 
                        src={settings.favicon_url} 
                        alt="Favicon" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Type className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*,.ico"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Favicon
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: 32x32px, ICO or PNG
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Reference for Look Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Model Reference Image
              </CardTitle>
              <CardDescription>
                Upload a reference image to guide the AI when generating "Total Look" images. 
                The generated model will resemble this reference in terms of pose, style, and appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-44 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden relative">
                  {modelReferenceImage ? (
                    <>
                      <img 
                        src={modelReferenceImage} 
                        alt="Model reference" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 w-6 h-6"
                        onClick={handleRemoveModelRef}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={modelRefInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleModelRefUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => modelRefInputRef.current?.click()}
                    disabled={uploadingModelRef}
                  >
                    {uploadingModelRef ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {modelReferenceImage ? 'Replace Reference' : 'Upload Reference'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Upload a full-body photo of a model. The AI will use this as a reference 
                    for pose and appearance when generating "Total Look" images.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended: High-quality full-body photo, 3:4 aspect ratio
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Theme
              </CardTitle>
              <CardDescription>Customize your platform colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer border"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Preview:</p>
                <div className="flex gap-4">
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Primary
                  </div>
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-xs"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    Secondary
                  </div>
                  <div 
                    className="w-20 h-20 rounded flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: accentColor }}
                  >
                    Accent
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resale Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Resale Sharing
              </CardTitle>
              <CardDescription>
                Show a "Sell This Item" button on product pages, allowing users to share products to Vinted, Depop, WhatsApp and more.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="resaleSharing">Enable resale sharing button</Label>
                <Switch
                  id="resaleSharing"
                  checked={resaleSharingEnabled}
                  onCheckedChange={handleResaleSharingToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Link Destination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Product Link Destination
              </CardTitle>
              <CardDescription>
                Control where product links point across the platform — carousels, recommendations, and similar products. When enabled, links open the brand's website instead of the platform product page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="productLinkDest">Link to brand website</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {productLinkDest === 'brand_website' 
                      ? 'Products link to the brand website (source URL)' 
                      : 'Products link to platform product pages'}
                  </p>
                </div>
                <Switch
                  id="productLinkDest"
                  checked={productLinkDest === 'brand_website'}
                  onCheckedChange={handleProductLinkDestToggle}
                />
              </div>
            </CardContent>
          </Card>

          <RepairServiceSettings />

          {/* Atelier Compositions */}
          <CompositionSettingsSection />

          {/* Shopify Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Shopify Integration
              </CardTitle>
              <CardDescription>
                Connect your Shopify Storefront API to enable "Add to Bag" buttons on product pages. Products need a Shopify handle mapped to work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="shopifyEnabled">Enable Shopify checkout</Label>
                <Switch id="shopifyEnabled" checked={shopifyEnabled} onCheckedChange={setShopifyEnabled} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopifyDomain">Shop Domain</Label>
                <Input id="shopifyDomain" placeholder="your-store.myshopify.com" value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopifyToken">Storefront Access Token</Label>
                <Input id="shopifyToken" placeholder="Paste your storefront token" value={shopifyToken} onChange={e => setShopifyToken(e.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shopifyEmbed">Embed checkout on page</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Show checkout in an overlay instead of opening a new tab</p>
                </div>
                <Switch id="shopifyEmbed" checked={shopifyEmbed} onCheckedChange={setShopifyEmbed} />
              </div>
              <Button variant="outline" size="sm" onClick={handleShopifySave}>
                <Save className="w-4 h-4 mr-2" /> Save Shopify Settings
              </Button>
            </CardContent>
          </Card>

          {/* Cache Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Cache Management
              </CardTitle>
              <CardDescription>
                Clear locally cached data such as image classification results and browser storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    if ('caches' in window) {
                      caches.keys().then(names => names.forEach(name => caches.delete(name)));
                    }
                    toast({ title: 'Cache cleared', description: 'All local caches have been cleared. The page will reload.' });
                    setTimeout(() => window.location.reload(), 1200);
                  } catch {
                    toast({ title: 'Error', description: 'Failed to clear cache', variant: 'destructive' });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Cache
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
