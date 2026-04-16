import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  images: any;
  price: string | null;
  description: string | null;
  composition: string | null;
  category: string | null;
  color: string | null;
  collection: string | null;
  care_instructions: string | null;
  product_code: string | null;
  wear_with: any;
  you_may_also_like: any;
  material: string | null;
}

export interface CatalogField {
  label: string;
  filled: number;
  total: number;
  pct: number;
}

export interface Recommendation {
  id: string;
  severity: 'red' | 'amber' | 'green' | 'info';
  icon: string;
  message: string;
  cta: string;
  ctaLink: string;
}

export function useDashboardData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pageViews, setPageViews] = useState<number | null>(null);
  const [qrScans, setQrScans] = useState<number | null>(null);
  const [activeCarousels, setActiveCarousels] = useState(0);
  const [totalCarousels, setTotalCarousels] = useState(0);
  const [campaignAssetsEnabled, setCampaignAssetsEnabled] = useState(0);
  const [campaignAssetsTotal, setCampaignAssetsTotal] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [apiIntegrations, setApiIntegrations] = useState(0);
  const [activationsCount, setActivationsCount] = useState(0);
  const [celebrityCount, setCelebrityCount] = useState(0);
  const [topScanLocation, setTopScanLocation] = useState<{ location: string; count: number } | null>(null);
  const [mostViewedProduct, setMostViewedProduct] = useState<{ code: string; views: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products (all, up to a reasonable limit)
      const { data: prods, count: prodCount } = await supabase
        .from('products')
        .select('id,name,images,price,description,composition,category,color,collection,care_instructions,product_code,wear_with,you_may_also_like,material', { count: 'exact' })
        .limit(1000);
      
      setProducts(prods || []);
      setTotalProducts(prodCount || prods?.length || 0);

      // Carousels
      const { data: carousels } = await supabase.from('product_carousels').select('id,is_active');
      setTotalCarousels(carousels?.length || 0);
      setActiveCarousels(carousels?.filter(c => c.is_active).length || 0);

      // Campaign assets
      const { data: assets } = await supabase.from('campaign_assets').select('id,enabled');
      setCampaignAssetsTotal(assets?.length || 0);
      setCampaignAssetsEnabled(assets?.filter(a => a.enabled).length || 0);

      // Leads
      const { count: lc } = await supabase.from('leads').select('id', { count: 'exact', head: true });
      setLeadsCount(lc || 0);

      // API integrations
      const { data: apis } = await supabase.from('api_integrations').select('id').eq('is_active', true);
      setApiIntegrations(apis?.length || 0);

      // Activations
      const { count: ac } = await supabase.from('activations').select('id', { count: 'exact', head: true });
      setActivationsCount(ac || 0);

      // Celebrity
      const { count: cc } = await supabase.from('celebrity_content').select('id', { count: 'exact', head: true });
      setCelebrityCount(cc || 0);

      // Scan events (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();

      const { count: scanCount } = await supabase
        .from('scan_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'scan')
        .gte('created_at', isoDate);
      setQrScans(scanCount ?? null);

      const { count: pvCount } = await supabase
        .from('product_views')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', isoDate);
      setPageViews(pvCount ?? null);

      // Top scan location from metadata
      const { data: scanEvents } = await supabase
        .from('scan_events')
        .select('metadata')
        .eq('event_type', 'scan')
        .gte('created_at', isoDate)
        .limit(500);
      
      if (scanEvents && scanEvents.length > 0) {
        const locationCounts: Record<string, number> = {};
        scanEvents.forEach((e: any) => {
          const city = (e.metadata as any)?.city;
          if (city) locationCounts[city] = (locationCounts[city] || 0) + 1;
        });
        const topEntry = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
        if (topEntry) setTopScanLocation({ location: topEntry[0], count: topEntry[1] });
      }

      // Most viewed product
      const { data: viewData } = await supabase
        .from('scan_events')
        .select('product_code')
        .eq('event_type', 'scan')
        .gte('created_at', isoDate)
        .limit(500);
      
      if (viewData && viewData.length > 0) {
        const codeCounts: Record<string, number> = {};
        viewData.forEach((e: any) => {
          if (e.product_code) codeCounts[e.product_code] = (codeCounts[e.product_code] || 0) + 1;
        });
        const topProd = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0];
        if (topProd) setMostViewedProduct({ code: topProd[0], views: topProd[1] });
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Computed: catalog fields
  const catalogFields: CatalogField[] = (() => {
    const total = products.length;
    if (total === 0) return [];
    
    const hasValue = (val: any) => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return false;
      return true;
    };

    const fields: { label: string; key: keyof Product | ((p: Product) => any) }[] = [
      { label: 'Images', key: 'images' },
      { label: 'Price', key: 'price' },
      { label: 'Description', key: 'description' },
      { label: 'Composition', key: 'composition' },
      { label: 'Categories / Color', key: (p) => p.category || p.color },
      { label: 'Collection', key: 'collection' },
      { label: 'Care Instructions', key: 'care_instructions' },
      { label: 'Product Code', key: 'product_code' },
      { label: 'Wear With / Styling', key: 'wear_with' },
      { label: 'Related Products', key: 'you_may_also_like' },
    ];

    return fields.map(f => {
      const filled = products.filter(p => {
        const val = typeof f.key === 'function' ? f.key(p) : p[f.key];
        return hasValue(val);
      }).length;
      return { label: f.label, filled, total, pct: Math.round((filled / total) * 100) };
    });
  })();

  // Health score
  const healthScore = (() => {
    let score = 0;
    const total = products.length;
    if (total === 0) return 0;

    score += 20; // products exist

    const getPct = (label: string) => catalogFields.find(f => f.label === label)?.pct || 0;
    if (getPct('Images') > 80) score += 15;
    if (getPct('Price') > 80) score += 15;
    if (getPct('Description') > 50) score += 10;
    if (getPct('Composition') > 50) score += 10;
    if (getPct('Categories / Color') > 50) score += 10;
    if (activeCarousels > 0) score += 5;
    if (campaignAssetsEnabled > 0) score += 5;
    if (apiIntegrations > 0) score += 5;
    if (leadsCount > 0) score += 5;
    return score;
  })();

  // Health explanation
  const healthExplanation = (() => {
    if (products.length === 0) return 'No products in catalog yet.';
    const compPct = catalogFields.find(f => f.label === 'Composition')?.pct || 0;
    const descPct = catalogFields.find(f => f.label === 'Description')?.pct || 0;
    if (compPct < 50 && descPct < 50) return 'Your catalog is missing composition and description data for many products.';
    if (compPct < 50) return 'Your catalog is well-structured but missing composition data for many products.';
    if (descPct < 50) return 'Your catalog needs more product descriptions to improve recommendation quality.';
    if (healthScore >= 80) return 'Excellent! Your catalog is comprehensive and well-structured.';
    return 'Your catalog has good coverage. Review recommendations below to improve further.';
  })();

  // Recommendations
  const recommendations: Recommendation[] = (() => {
    const recs: Recommendation[] = [];
    const compPct = catalogFields.find(f => f.label === 'Composition')?.pct || 0;
    const wearPct = catalogFields.find(f => f.label === 'Wear With / Styling')?.pct || 0;
    const missingComp = catalogFields.find(f => f.label === 'Composition');

    if (compPct < 50 && missingComp) {
      recs.push({
        id: 'composition-low',
        severity: 'red',
        icon: '🔴',
        message: `${missingComp.total - missingComp.filled} products missing composition data — Material data powers the 'Same Material' carousel engine.`,
        cta: 'Review products',
        ctaLink: '/',
      });
    }
    if (wearPct < 10) {
      recs.push({
        id: 'wear-with-low',
        severity: 'amber',
        icon: '🟡',
        message: "Wear With data not yet available — Styling data can drive 2-3x higher carousel engagement.",
        cta: 'Configure extraction',
        ctaLink: '/',
      });
    }
    if (leadsCount === 0) {
      recs.push({
        id: 'no-leads',
        severity: 'red',
        icon: '🔴',
        message: 'No leads captured yet — Set up a lead capture activation to start building your CRM.',
        cta: 'Create activation',
        ctaLink: '/activations',
      });
    }
    if (celebrityCount === 0) {
      recs.push({
        id: 'no-celebrity',
        severity: 'amber',
        icon: '🟡',
        message: 'No celebrity content imported — Celebrity associations increase product page dwell time.',
        cta: 'Import content',
        ctaLink: '/celebrity-content',
      });
    }
    if (campaignAssetsTotal > 0 && campaignAssetsEnabled < campaignAssetsTotal * 0.5) {
      recs.push({
        id: 'assets-low',
        severity: 'amber',
        icon: '🟡',
        message: `Only ${campaignAssetsEnabled}/${campaignAssetsTotal} campaign assets are enabled — Enable more assets for richer product pages.`,
        cta: 'Manage assets',
        ctaLink: '/admin/media-manager',
      });
    }
    if (apiIntegrations === 0) {
      recs.push({
        id: 'no-api',
        severity: 'info',
        icon: 'ℹ️',
        message: 'No API integrations configured — Connect your CRM or e-commerce platform for automated data sync.',
        cta: 'Set up API',
        ctaLink: '/api-settings',
      });
    }
    if (activeCarousels === 0 && totalCarousels > 0) {
      recs.push({
        id: 'carousel-inactive',
        severity: 'green',
        icon: '🟢',
        message: 'You have carousels configured but none active. Activate cross-sell carousels to boost discovery.',
        cta: 'Create carousel',
        ctaLink: '/admin/carousels',
      });
    }

    const severityOrder = { red: 0, amber: 1, green: 2, info: 3 };
    return recs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  })();

  return {
    loading,
    refetch: fetchAll,
    totalProducts,
    products,
    pageViews,
    qrScans,
    activeCarousels,
    totalCarousels,
    campaignAssetsEnabled,
    campaignAssetsTotal,
    leadsCount,
    apiIntegrations,
    activationsCount,
    celebrityCount,
    topScanLocation,
    mostViewedProduct,
    catalogFields,
    healthScore,
    healthExplanation,
    recommendations,
  };
}
