import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Trash2, Save, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getFlatLayImage, parseImages, filterImagesBySku, getCollageSourceImage } from '@/utils/imageUtils';
import { useImageClassification } from '@/hooks/useImageClassification';
import { supabase } from '@/integrations/supabase/client';
import { collageQueue } from '@/lib/collageQueue';
import { invokeCollage } from '@/lib/collageStream';
import { fetchLookModeRules, resolveLookMode, type LookMode, type LookModeRules, DEFAULT_LOOK_MODE_RULES } from '@/lib/lookMode';
import type { Look, Product } from '@/hooks/useLooks';

interface LookCardProps {
  look: Look;
  onSave?: () => void;
  onDelete?: () => void;
  isSaved?: boolean;
}

interface ProductImageProps {
  product: Product;
  isModelReady: boolean;
  classifyProductImages: (productId: string, images: string[], category?: string | null) => Promise<string | null>;
  getCached: (productId: string) => string | null;
}

const ProductImage = ({ product, isModelReady, classifyProductImages, getCached }: ProductImageProps) => {
  const parsedImages = parseImages(product.images);
  const skuFiltered = filterImagesBySku(parsedImages, null);
  const patternBasedImage = getFlatLayImage(skuFiltered, product.category);
  
  // Check cache first for instant display
  const cachedImage = getCached(product.id);
  
  const [displayImage, setDisplayImage] = useState<string | null>(cachedImage || patternBasedImage);
  const [isClassifying, setIsClassifying] = useState(false);

  useEffect(() => {
    // If we have a cached result, use it
    if (cachedImage) {
      setDisplayImage(cachedImage);
      return;
    }

    // If model is ready and we have images, classify them
    if (isModelReady && parsedImages.length > 0) {
      setIsClassifying(true);
      classifyProductImages(product.id, parsedImages, product.category)
        .then((bestImage) => {
          if (bestImage) {
            setDisplayImage(bestImage);
          }
        })
        .finally(() => {
          setIsClassifying(false);
        });
    }
  }, [isModelReady, product.id, product.category, cachedImage, parsedImages, classifyProductImages]);

  if (isClassifying) {
    return (
      <div className="aspect-square flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (displayImage) {
    return (
      <div className="aspect-square">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="aspect-square flex items-center justify-center bg-muted">
      <span className="text-xs text-muted-foreground">No image</span>
    </div>
  );
};

export const LookCard = ({ look, onSave, onDelete, isSaved = false }: LookCardProps) => {
  const products = look.products || [];
  const { isModelLoading, isModelReady, loadProgress, classifyProductImages, getCached } = useImageClassification();
  const productSignature = useMemo(
    () => products.map((p) => `${p.id}:${p.name}:${p.category ?? ''}:${parseImages(p.images).join('|')}`).join('||'),
    [products]
  );

  // Photo / Collage mode state — seed from persisted cache on the look row.
  const [rules, setRules] = useState<LookModeRules>(DEFAULT_LOOK_MODE_RULES);
  const [mode, setMode] = useState<LookMode>('photo');
  const [photoUrl, setPhotoUrl] = useState<string | null>(look.photo_image_url ?? null);
  const [collageUrl, setCollageUrl] = useState<string | null>(look.collage_image_url ?? null);
  const [genPhoto, setGenPhoto] = useState(false);
  const [genCollage, setGenCollage] = useState(false);

  useEffect(() => {
    setPhotoUrl(look.photo_image_url ?? null);
    setCollageUrl(look.collage_image_url ?? null);
    setGenPhoto(false);
    setGenCollage(false);
  }, [look.id, look.name, look.photo_image_url, look.collage_image_url, productSignature]);

  useEffect(() => {
    fetchLookModeRules().then(r => {
      setRules(r);
      setMode(resolveLookMode(products, r));
    });
  }, [look.id, products]);

  useEffect(() => {
    if (products.length === 0) return;

    if (mode === 'photo' && !photoUrl && !genPhoto) {
      void generatePhoto();
    }

    if (mode === 'collage' && !collageUrl && !genCollage) {
      void generateCollage();
    }
  }, [mode, products, photoUrl, collageUrl, genPhoto, genCollage]);

  const photoPayload = useMemo(() => products.map(p => {
    const imgs = parseImages(p.images);
    return {
      name: p.name,
      color: p.color,
      category: p.category,
      image: getFlatLayImage(filterImagesBySku(imgs, null), p.category) || imgs[0],
    };
  }), [products]);

  // Strict lay-flat candidates for the collage pipeline. Falls back through
  // a list (joined by newlines) so the edge function tries each until one
  // returns bytes. Worn/editorial images are filtered out by getCollageSourceImage.
  const collagePayload = useMemo(() => products.map(p => {
    const approved = p.approved_lay_flat_image_url || null;
    if (!approved) return null;
    return {
      name: p.name,
      color: p.color,
      category: p.category,
      image: approved,
      trusted_image: approved,
    };
  }).filter((p): p is { name: string; color: string | null; category: string | null; image: string; trusted_image: string } => p !== null), [products]);


  const generatePhoto = async () => {
    if (genPhoto || products.length === 0) return;
    setGenPhoto(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-look-image', {
        body: { products: photoPayload, lookName: look.name, lookDescription: look.description, lookStyle: 'elegant' }
      });
      if (!error && data?.image) setPhotoUrl(data.image);
    } finally { setGenPhoto(false); }
  };

  const generateCollage = async () => {
    if (genCollage || products.length === 0) return;
    setGenCollage(true);
    try {
      if (collagePayload.length === 0) return;
      const { image } = await collageQueue(() =>
        invokeCollage(collagePayload, (img) => setCollageUrl(img))
      );
      if (image) setCollageUrl(image);
    } finally { setGenCollage(false); }
  };

  const handleSwitch = (m: LookMode) => {
    setMode(m);
    if (m === 'photo' && !photoUrl && !genPhoto) generatePhoto();
    if (m === 'collage' && !collageUrl && !genCollage) generateCollage();
  };

  // Calculate total price
  const totalPrice = products.reduce((sum, product) => {
    if (product.price) {
      const priceNum = parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(priceNum)) {
        return sum + priceNum;
      }
    }
    return sum;
  }, 0);

  const activeImage = mode === 'photo' ? photoUrl : collageUrl;
  const activeGenerating = mode === 'photo' ? genPhoto : genCollage;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{look.name}</CardTitle>
          {totalPrice > 0 && (
            <span className="text-lg font-semibold">
              €{totalPrice.toFixed(2)}
            </span>
          )}
        </div>
        {isModelLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading image AI... {loadProgress}%</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Color palette */}
        {look.color_palette && look.color_palette.length > 0 && (
          <div className="flex gap-1">
            {look.color_palette.map((color, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {color}
              </Badge>
            ))}
          </div>
        )}

        {/* Photo / Collage preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              {(['photo', 'collage'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSwitch(m)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  {m === 'photo' ? 'Photo' : 'Collage'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Auto: {resolveLookMode(products, rules)}
            </span>
          </div>
          <div className="relative aspect-[3/4] rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
            {activeGenerating ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Generating {mode}...</span>
              </div>
            ) : activeImage ? (
              <img src={activeImage} alt={`${look.name} ${mode}`} className={`w-full h-full ${mode === 'collage' ? 'object-contain' : 'object-cover'}`} />
            ) : (
              <Button size="sm" variant="outline" onClick={mode === 'photo' ? generatePhoto : generateCollage} disabled={products.length === 0}>
                <Sparkles className="w-4 h-4 mr-1" />
                Generate {mode === 'photo' ? 'Photo' : 'Collage'}
              </Button>
            )}
          </div>
        </div>



        {/* Products grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map(product => (
            <div 
              key={product.id} 
              className="group relative border rounded-lg overflow-hidden bg-muted/30"
            >
              <ProductImage
                product={product}
                isModelReady={isModelReady}
                classifyProductImages={classifyProductImages}
                getCached={getCached}
              />
              
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium line-clamp-2">{product.name}</p>
                {product.price && (
                  <p className="text-xs text-muted-foreground">{product.price}</p>
                )}
                {product.source_url && (
                  <a
                    href={product.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AI reasoning */}
        {look.ai_reasoning && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground italic">
              "{look.ai_reasoning}"
            </p>
          </div>
        )}

        {look.description && (
          <p className="text-sm text-muted-foreground">{look.description}</p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {!isSaved && onSave && (
          <Button size="sm" variant="default" onClick={onSave} className="flex-1">
            <Save className="w-4 h-4 mr-1" />
            Save Look
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete look?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{look.name}". This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};
