import { AppHeader } from '@/components/AppHeader';
import { BarChart3, Eye, MousePointerClick, Users, RefreshCw, Loader2, MapPin, Download, Trash2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useScanAnalytics } from '@/hooks/useScanAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { SourceFilter } from '@/components/analytics/SourceFilter';
import { ProductAnalyticsTable } from '@/components/analytics/ProductAnalyticsTable';
import { SessionsList } from '@/components/analytics/SessionsList';
import { EventLogTable } from '@/components/analytics/EventLogTable';

// Teal Curator chart palette
const TEAL_DEEP = '#0ab38f';
const TEAL_MID = '#0dc8a3';
const TEAL_PALE = '#a3e8d6';
const CORAL = '#ff8670';
const SLATE = '#4f5d82';

interface MetricCardProps {
  label: string;
  value: string | number;
  Icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  spark?: number[];
  sparkColor?: string;
}

const MetricCard = ({ label, value, Icon, trend, spark, sparkColor = TEAL_MID }: MetricCardProps) => (
  <div
    className="rounded-xl overflow-hidden flex flex-col"
    style={{
      background: 'var(--admin-surface-container)',
      boxShadow: 'var(--admin-shadow-sm)',
    }}
  >
    <div className="flex items-start justify-between px-5 pt-5">
      <div>
        <p className="admin-label" style={{ marginBottom: 12 }}>{label}</p>
        <p className="admin-hero-metric" style={{ fontSize: '2.25rem' }}>{value}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Icon className="w-4 h-4" style={{ color: 'var(--admin-text-tertiary)' }} />
        {trend && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              background: trend.positive ? 'rgba(13, 200, 163, 0.12)' : 'rgba(255, 134, 112, 0.14)',
              color: trend.positive ? TEAL_DEEP : '#e06650',
            }}
          >
            {trend.positive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
    {/* Sparkline strip */}
    <div className="h-12 mt-3">
      {spark && spark.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark.map((v, i) => ({ i, v }))}>
            <defs>
              <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} fill={`url(#spark-${label})`} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full" style={{ background: `linear-gradient(180deg, ${sparkColor}22, transparent)` }} />
      )}
    </div>
  </div>
);


const ScanAnalyticsPage = () => {
  const {
    datePreset, setDatePreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    sourceFilter, setSourceFilter,
    scanEvents,
    pairScores,
    eventsLoading,
    scoresLoading,
    totalScans, totalPageViews, totalClicks, totalLeads,
    dailyData,
    topProducts,
    topLocations,
    productRows,
    sessionRows,
    aggregate, aggregating,
    clearEvents, clearing,
    exportCsv,
  } = useScanAnalytics();

  if (eventsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <AppHeader>
            <h1 className="text-2xl font-light text-foreground">Scan Analytics</h1>
          </AppHeader>
        </div>
        <div className="flex items-center justify-end gap-2 mb-6">
            <Button onClick={() => exportCsv()} variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={() => aggregate()} disabled={aggregating} variant="outline" size="sm">
              {aggregating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Aggregate
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5" disabled={clearing}>
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all scan events?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all scan events. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearEvents()}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <DateRangeFilter
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            customStart={customStart}
            customEnd={customEnd}
            setCustomStart={setCustomStart}
            setCustomEnd={setCustomEnd}
          />
          <SourceFilter value={sourceFilter} onChange={setSourceFilter} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />QR Scans</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{totalScans}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Eye className="w-4 h-4" />Page Views</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{totalPageViews}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MousePointerClick className="w-4 h-4" />Look Clicks</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{totalClicks}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />Lead Captures</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{totalLeads}</p></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {dailyData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg font-medium">Events Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="scans" stackId="a" fill="hsl(142, 71%, 45%)" name="Scans" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="page_views" stackId="a" fill="hsl(217, 91%, 60%)" name="Page Views" />
                      <Bar dataKey="clicks" stackId="a" fill="hsl(271, 81%, 56%)" name="Clicks" />
                      <Bar dataKey="leads" stackId="a" fill="hsl(45, 93%, 47%)" name="Leads" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader><CardTitle className="text-lg font-medium">Most Viewed Products</CardTitle></CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => (
                        <div key={p.code} className="flex items-center justify-between">
                          <span className="text-sm text-foreground"><span className="text-muted-foreground mr-2">{i + 1}.</span>{p.code}</span>
                          <span className="text-sm font-medium text-foreground">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader><CardTitle className="text-lg font-medium flex items-center gap-2"><MapPin className="w-4 h-4" />Scan Locations</CardTitle></CardHeader>
                <CardContent>
                  {topLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No location data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {topLocations.map((loc, i) => (
                        <div key={`${loc.country}-${loc.city}`} className="flex items-center justify-between">
                          <span className="text-sm text-foreground"><span className="text-muted-foreground mr-2">{i + 1}.</span>{loc.city}, {loc.country}</span>
                          <span className="text-sm font-medium text-foreground">{loc.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Pairs */}
              <Card>
                <CardHeader><CardTitle className="text-lg font-medium">Top Product Pairs</CardTitle></CardHeader>
                <CardContent>
                  {scoresLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : pairScores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pair scores yet. Click "Aggregate" to compute.</p>
                  ) : (
                    <div className="space-y-3">
                      {pairScores.slice(0, 10).map((pair, i) => (
                        <div key={pair.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground"><span className="text-muted-foreground mr-2">{i + 1}.</span>{pair.product_code_a} × {pair.product_code_b}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{pair.click_count} clicks</span>
                            <span className="font-medium text-foreground">{pair.score.toFixed(0)}pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductAnalyticsTable rows={productRows} />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionsList sessions={sessionRows} />
          </TabsContent>

          {/* Event Log Tab */}
          <TabsContent value="events">
            <EventLogTable events={scanEvents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScanAnalyticsPage;
