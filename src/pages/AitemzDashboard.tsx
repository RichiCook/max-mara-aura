import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Layers, Sparkles, Users, ImageIcon, ArrowRight, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';

interface Metric {
  label: string;
  value: string | number;
  trendPct?: number;
}

const MetricCard = ({ label, value, trendPct }: Metric) => (
  <div
    className="p-6 flex flex-col justify-between"
    style={{
      background: '#ffffff',
      border: '1px solid var(--admin-ghost-border)',
      borderRadius: 'var(--admin-radius-lg)',
      boxShadow: 'var(--admin-shadow-sm)',
      minHeight: 140,
    }}
  >
    <div className="admin-label">{label}</div>
    <div className="flex items-end justify-between">
      <div className="admin-hero-metric">{value}</div>
      {typeof trendPct === 'number' && (
        <div
          className="flex items-center gap-1"
          style={{
            fontFamily: 'var(--admin-font-mono)',
            fontSize: 11,
            color: trendPct >= 0 ? 'var(--admin-purple)' : 'var(--admin-text-tertiary)',
          }}
        >
          <TrendingUp className="w-3 h-3" />
          {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
        </div>
      )}
    </div>
  </div>
);

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-end justify-between mb-4">
    <h2 className="admin-section-title">{title}</h2>
    {action}
  </div>
);

export const AitemzDashboard = () => {
  const { settings } = usePlatformSettingsContext();
  const brand = settings.brand_name || 'Studio';
  const [scans, setScans] = useState(0);
  const [claims, setClaims] = useState(0);
  const [leads, setLeads] = useState(0);
  const [products, setProducts] = useState(0);
  const [trend, setTrend] = useState<{ date: string; scans: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ code: string; scans: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [scansRes, leadsRes, productsRes, eventsRes, recentRes] = await Promise.all([
        supabase.from('scan_events').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase
          .from('scan_events')
          .select('product_code, created_at, event_type')
          .gte('created_at', since.toISOString())
          .limit(2000),
        supabase
          .from('scan_events')
          .select('product_code, event_type, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      setScans(scansRes.count || 0);
      setLeads(leadsRes.count || 0);
      setProducts(productsRes.count || 0);

      const events = eventsRes.data || [];
      setClaims(events.filter((e: any) => e.event_type === 'claim').length);

      // Build daily trend
      const byDay: Record<string, number> = {};
      events.forEach((e: any) => {
        const d = new Date(e.created_at).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      });
      const days: { date: string; scans: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key.slice(5), scans: byDay[key] || 0 });
      }
      setTrend(days);

      // Top products
      const byProd: Record<string, number> = {};
      events.forEach((e: any) => {
        if (!e.product_code) return;
        byProd[e.product_code] = (byProd[e.product_code] || 0) + 1;
      });
      setTopProducts(
        Object.entries(byProd)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([code, scans]) => ({ code, scans }))
      );

      setRecent(recentRes.data || []);
    })();
  }, []);

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="admin-subtitle mb-2">Aitemz Studio</div>
        <h1 className="admin-page-title mb-1">Dashboard</h1>
        <div className="admin-body-secondary">Christian Louboutin — Last 30 days</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <MetricCard label="Total scans" value={scans.toLocaleString()} trendPct={12.4} />
        <MetricCard label="Claims" value={claims.toLocaleString()} trendPct={4.2} />
        <MetricCard label="Leads" value={leads.toLocaleString()} trendPct={8.1} />
        <MetricCard label="Products" value={products.toLocaleString()} />
      </div>

      {/* Engagement trend */}
      <section className="mb-12">
        <SectionHeader title="Engagement trend" />
        <div
          className="p-6"
          style={{
            background: '#ffffff',
            border: '1px solid var(--admin-ghost-border)',
            borderRadius: 'var(--admin-radius-lg)',
            boxShadow: 'var(--admin-shadow-sm)',
          }}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ee6bcf" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ee6bcf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ebebeb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#a0a0a0', fontFamily: 'Roboto Mono' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a0a0a0', fontFamily: 'Roboto Mono' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #d6d6d6',
                  borderRadius: 4,
                  fontFamily: 'Roboto Mono',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                stroke="#ee6bcf"
                strokeWidth={2}
                fill="url(#scanFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top products + Recent */}
      <div className="grid lg:grid-cols-2 gap-6 mb-12">
        <section>
          <SectionHeader title="Top products by scans" />
          <div
            className="p-6"
            style={{
              background: '#ffffff',
              border: '1px solid var(--admin-ghost-border)',
              borderRadius: 'var(--admin-radius-lg)',
              boxShadow: 'var(--admin-shadow-sm)',
            }}
          >
            {topProducts.length === 0 ? (
              <div className="admin-body-secondary text-center py-8">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 10 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#a0a0a0', fontFamily: 'Roboto Mono' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="code"
                    tick={{ fontSize: 10, fill: '#272727', fontFamily: 'Roboto Mono' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #d6d6d6',
                      borderRadius: 4,
                      fontFamily: 'Roboto Mono',
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="scans" fill="#ee6bcf" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Recent activity"
            action={
              <Link
                to="/scan-analytics"
                className="admin-caption flex items-center gap-1 hover:opacity-70"
                style={{ color: 'var(--admin-purple)' }}
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <div
            className="p-2"
            style={{
              background: '#ffffff',
              border: '1px solid var(--admin-ghost-border)',
              borderRadius: 'var(--admin-radius-lg)',
              boxShadow: 'var(--admin-shadow-sm)',
            }}
          >
            {recent.length === 0 ? (
              <div className="admin-body-secondary text-center py-8">No recent events</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Event</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'var(--admin-font-mono)', fontSize: 12 }}>
                        {e.product_code || '—'}
                      </td>
                      <td>
                        <span className="admin-badge active">{e.event_type}</span>
                      </td>
                      <td className="admin-body-secondary">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section>
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: '/looks', label: 'Total Looks', Icon: Sparkles },
            { to: '/activations', label: 'Activations', Icon: Layers },
            { to: '/leads', label: 'Leads', Icon: Users },
            { to: '/admin/media-manager', label: 'Campaign Assets', Icon: ImageIcon },
          ].map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="p-4 flex items-center gap-3 hover:border-[var(--admin-purple)] transition-colors"
              style={{
                background: '#ffffff',
                border: '1px solid var(--admin-ghost-border)',
                borderRadius: 'var(--admin-radius-md)',
              }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--admin-purple)' }} />
              <span
                style={{
                  fontFamily: 'var(--admin-font-mono)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--admin-text-primary)',
                }}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AitemzDashboard;
