import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { useWardrobe } from '@/hooks/useWardrobe';
import { useSavedLooks } from '@/hooks/useSavedLooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Heart, Shirt, Sparkles, X, LogOut } from 'lucide-react';
import { getMainProductImage } from '@/utils/imageUtils';
import { normalizeImages } from '@/hooks/useProducts';

interface ProductLite {
  id: string;
  name: string;
  slug: string;
  product_code: string | null;
  category: string | null;
  price: string | null;
  images: string[];
}

const ProductGrid = ({
  products,
  onRemove,
  emptyTitle,
  emptyHint,
  removeLabel,
}: {
  products: ProductLite[];
  onRemove: (id: string) => void;
  emptyTitle: string;
  emptyHint: string;
  removeLabel: string;
}) => {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-lg">
        <p className="font-serif text-xl text-foreground mb-2">{emptyTitle}</p>
        <p className="font-sans text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {products.map((p) => {
        const img = getMainProductImage(p.images, p.product_code, p.category);
        return (
          <div key={p.id} className="group relative">
            <Link to={`/product/${p.slug}`} className="block">
              <div className="aspect-[3/4] bg-muted overflow-hidden rounded-md">
                {img ? (
                  <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="mt-3">
                <p className="font-sans text-[13px] text-foreground line-clamp-1">{p.name}</p>
                {p.price && (
                  <p className="font-sans text-[12px] text-muted-foreground mt-0.5">{p.price}</p>
                )}
              </div>
            </Link>
            <button
              onClick={() => onRemove(p.id)}
              aria-label={removeLabel}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'wardrobe' || tabParam === 'profile' || tabParam === 'looks'
      ? tabParam
      : 'wishlist';

  const wishlist = useWishlist();
  const wardrobe = useWardrobe();
  const savedLooks = useSavedLooks();
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [lookProductsMap, setLookProductsMap] = useState<Record<string, ProductLite | null>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/account' } } });
    }
  }, [user, authLoading, navigate]);

  const allIds = useMemo(
    () => Array.from(new Set([...wishlist.productIds, ...wardrobe.productIds])),
    [wishlist.productIds, wardrobe.productIds]
  );

  useEffect(() => {
    if (allIds.length === 0) {
      setProducts([]);
      return;
    }
    supabase
      .from('products')
      .select('id, name, slug, product_code, category, price, images')
      .in('id', allIds)
      .then(({ data }) => {
        setProducts(
          (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            product_code: p.product_code,
            category: p.category,
            price: p.price,
            images: normalizeImages(p.images),
          }))
        );
      });
  }, [allIds]);

  // Resolve first product of each saved look to its slug (for click-through)
  useEffect(() => {
    const codes = Array.from(
      new Set(savedLooks.savedLooks.flatMap((l) => l.product_codes).filter(Boolean))
    );
    if (codes.length === 0) {
      setLookProductsMap({});
      return;
    }
    supabase
      .from('products')
      .select('id, name, slug, product_code, category, price, images')
      .in('product_code', codes)
      .then(({ data }) => {
        const map: Record<string, ProductLite> = {};
        (data ?? []).forEach((p: any) => {
          if (p.product_code) {
            map[p.product_code] = {
              id: p.id,
              name: p.name,
              slug: p.slug,
              product_code: p.product_code,
              category: p.category,
              price: p.price,
              images: normalizeImages(p.images),
            };
          }
        });
        setLookProductsMap(map);
      });
  }, [savedLooks.savedLooks]);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlist.productIds.includes(p.id)),
    [products, wishlist.productIds]
  );
  const wardrobeProducts = useMemo(
    () => products.filter((p) => wardrobe.productIds.includes(p.id)),
    [products, wardrobe.productIds]
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <header className="mb-10">
          <h1 className="font-serif text-4xl text-foreground mb-1">My Account</h1>
          <p className="font-sans text-sm text-muted-foreground">{user.email}</p>
        </header>

        <Tabs
          value={initialTab}
          onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        >
          <TabsList className="mb-8">
            <TabsTrigger value="looks" className="gap-2">
              <Sparkles size={14} /> Looks ({savedLooks.savedLooks.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2">
              <Heart size={14} /> Wishlist ({wishlistProducts.length})
            </TabsTrigger>
            <TabsTrigger value="wardrobe" className="gap-2">
              <Shirt size={14} /> Wardrobe ({wardrobeProducts.length})
            </TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="looks">
            {savedLooks.savedLooks.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-lg">
                <p className="font-serif text-xl text-foreground mb-2">No saved looks yet</p>
                <p className="font-sans text-sm text-muted-foreground">
                  Tap the bookmark on any AI-curated look to save it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {savedLooks.savedLooks.map((l) => {
                  const firstCode = l.product_codes[0];
                  const firstProduct = firstCode ? lookProductsMap[firstCode] : null;
                  const linkTo = firstProduct ? `/product/${firstProduct.slug}` : '#';
                  return (
                    <div key={l.id} className="group relative">
                      <Link to={linkTo} className="block">
                        <div className="aspect-[3/4] bg-muted overflow-hidden rounded-md">
                          {l.image_url ? (
                            <img
                              src={l.image_url}
                              alt={l.name ?? 'Saved look'}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Sparkles size={24} />
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="font-serif text-[15px] text-foreground line-clamp-1">
                            {l.name ?? 'Untitled look'}
                          </p>
                          <p className="font-sans text-[12px] text-muted-foreground mt-0.5">
                            {l.product_codes.length} pieces
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => savedLooks.remove(l.product_codes)}
                        aria-label="Remove from saved looks"
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlist">
            <ProductGrid
              products={wishlistProducts}
              onRemove={(id) => wishlist.toggle(id)}
              emptyTitle="Your wishlist is empty"
              emptyHint="Tap the heart on any product to save it for later."
              removeLabel="Remove from wishlist"
            />
          </TabsContent>

          <TabsContent value="wardrobe">
            <ProductGrid
              products={wardrobeProducts}
              onRemove={(id) => wardrobe.remove(id)}
              emptyTitle="Your wardrobe is empty"
              emptyHint="Tap “Add to wardrobe” on a product page to add it here."
              removeLabel="Remove from wardrobe"
            />
          </TabsContent>

          <TabsContent value="profile">
            <div className="max-w-md space-y-4">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="font-sans text-[15px] text-foreground mt-1">{user.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
