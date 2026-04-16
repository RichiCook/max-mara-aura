import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Package, Eye, QrCode, MousePointer, MapPin, BarChart3, Layers, X, ArrowRight, Clock } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { HealthScoreRing } from '@/components/dashboard/HealthScoreRing';
import { useDashboardData, Recommendation } from '@/hooks/useDashboardData';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function DashboardPage() {
  const { settings } = usePlatformSettingsContext();
  const data = useDashboardData();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dashboard_dismissed_recs') || '[]'); } catch { return []; }
  });

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('dashboard_dismissed_recs', JSON.stringify(next));
  };

  const visibleRecs = data.recommendations.filter(r => !dismissed.includes(r.id));

  const kpis = [
    { label: 'Total Products', value: data.totalProducts, icon: Package, color: 'text-blue-600' },
    { label: 'Page Views (30d)', value: data.pageViews, icon: Eye, color: 'text-emerald-600' },
    { label: 'QR Scans (30d)', value: data.qrScans, icon: QrCode, color: 'text-violet-600' },
    { label: 'Active Carousels', value: `${data.activeCarousels} / ${data.totalCarousels}`, icon: Layers, color: 'text-amber-600' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#f5f5f5]">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 flex items-center justify-between border-b bg-background px-4 md:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-sm font-semibold leading-none">
                  {getGreeting()}, {settings.brand_name || 'Team'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate()}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={data.refetch} disabled={data.loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${data.loading ? 'animate-spin' : ''}`} />
              Refresh data
            </Button>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Health Score */}
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center py-8">
                <HealthScoreRing score={data.healthScore} />
                <p className="text-sm text-muted-foreground mt-4 text-center max-w-md">
                  {data.healthExplanation}
                </p>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                    <p className="text-2xl font-semibold">
                      {kpi.value !== null && kpi.value !== undefined ? kpi.value : '—'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Catalog Data Quality */}
            {data.catalogFields.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Catalog Data Quality</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Completeness across your {data.totalProducts.toLocaleString()} products
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.catalogFields.map((field) => (
                    <div key={field.label} className="flex items-center gap-3">
                      <span className="text-xs w-36 shrink-0 text-muted-foreground">{field.label}</span>
                      <div className="flex-1">
                        <Progress
                          value={field.pct}
                          className="h-2"
                        />
                      </div>
                      <span className="text-xs w-20 text-right text-muted-foreground">
                        {field.filled}/{field.total}
                      </span>
                      <span className="text-xs w-10 text-right font-medium">
                        {field.pct}%
                      </span>
                      <span className="w-4 text-center text-xs">
                        {field.pct > 80 ? '✅' : field.pct >= 30 ? '⚠️' : '🔴'}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Fields with low coverage limit recommendation accuracy.{' '}
                    <Link to="/" className="text-primary hover:underline">Review products →</Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {visibleRecs.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Recommended Actions</h2>
                {visibleRecs.map((rec) => (
                  <Card key={rec.id} className="border-border/50">
                    <CardContent className="p-4 flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{rec.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{rec.message}</p>
                        <Link to={rec.ctaLink}>
                          <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-primary">
                            {rec.cta} <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                      <button onClick={() => dismiss(rec.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Top Scan Location</span>
                  </div>
                  {data.topScanLocation ? (
                    <>
                      <p className="text-sm font-semibold">{data.topScanLocation.location}</p>
                      <p className="text-xs text-muted-foreground">{data.topScanLocation.count} scans</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Enable analytics to see this</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Most Viewed Product</span>
                  </div>
                  {data.mostViewedProduct ? (
                    <>
                      <p className="text-sm font-semibold font-mono">{data.mostViewedProduct.code}</p>
                      <p className="text-xs text-muted-foreground">{data.mostViewedProduct.views} views</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Enable analytics to see this</p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Active Carousels</span>
                  </div>
                  <p className="text-sm font-semibold">{data.activeCarousels} active</p>
                  <p className="text-xs text-muted-foreground">{data.totalCarousels} total</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    data.totalProducts > 0 && { icon: Package, text: `${data.totalProducts.toLocaleString()} products in catalog` },
                    data.campaignAssetsTotal > 0 && { icon: BarChart3, text: `${data.campaignAssetsTotal} campaign assets scanned` },
                    data.totalCarousels > 0 && { icon: Layers, text: `${data.totalCarousels} carousels configured (${data.activeCarousels} active)` },
                    data.activationsCount > 0 && { icon: MousePointer, text: `${data.activationsCount} activation${data.activationsCount !== 1 ? 's' : ''} created` },
                    (data.pageViews ?? 0) > 0 && { icon: Eye, text: `${data.pageViews} page views in the last 30 days` },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
