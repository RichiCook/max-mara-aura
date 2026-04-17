import { Link, useLocation } from 'react-router-dom';
import {
  Bookmark,
  Layers,
  Sparkles,
  Users,
  Settings2,
  LogOut,
  Palette,
  BarChart3,
  Star,
  ImageIcon,
  LayoutGrid,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { useLogoDisplay } from '@/hooks/useLogoDisplay';
import { cn } from '@/lib/utils';
import defaultLogo from '@/assets/logo.png';

const NAV = [
  { to: '/', label: 'Dashboard', Icon: BarChart3 },
  { to: '/looks', label: 'Total Looks', Icon: Sparkles },
  { to: '/celebrity-content', label: 'Celebrity', Icon: Star },
  { to: '/activations', label: 'Activations', Icon: Layers },
  { to: '/admin/media-manager', label: 'Campaign Assets', Icon: ImageIcon },
  { to: '/admin/carousels', label: 'Carousels', Icon: LayoutGrid },
  { to: '/leads', label: 'Leads', Icon: Users },
  { to: '/scan-analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/api-settings', label: 'API', Icon: Settings2 },
  { to: '/settings', label: 'Settings', Icon: Palette },
];

export const AdminSidebar = () => {
  const { signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  const { pathname } = useLocation();
  const logoUrl = settings.logo_url || defaultLogo;
  const { height: logoHeight } = useLogoDisplay();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[240px] z-40 px-4 py-6"
      style={{
        background: 'var(--admin-surface-container-low)',
        boxShadow: 'var(--admin-shadow-sm)',
      }}
    >
      {/* Brand lockup */}
      <Link to="/" className="flex items-center gap-3 px-2 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--admin-surface-container-high)' }}
        >
          <img
            src={logoUrl}
            alt={settings.brand_name || 'Atelier Admin'}
            className="object-contain max-h-8 max-w-8"
            style={{ height: Math.min(logoHeight, 28) }}
          />
        </div>
        <div className="leading-tight min-w-0">
          <div
            className="font-display text-[15px] font-bold truncate"
            style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-primary)' }}
          >
            {settings.brand_name || 'Atelier Admin'}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--admin-text-tertiary)' }}>
            Product Intelligence
          </div>
        </div>
      </Link>

      {/* Primary CTA */}
      <Link to="/" className="block mb-6">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-white text-sm font-semibold transition-all"
          style={{
            background: 'var(--admin-primary-gradient)',
            boxShadow: 'var(--admin-shadow-sm)',
          }}
        >
          <Plus className="w-4 h-4" />
          New Scrape
        </button>
      </Link>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto -mx-1 px-1">
        {NAV.map(({ to, label, Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link key={to} to={to}>
              <button
                className={cn(
                  'admin-sidebar-item w-full flex items-center gap-3 text-left',
                  isActive && 'active',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-0.5 pt-4 mt-4" style={{ borderTop: '1px solid var(--admin-ghost-border)' }}>
        <button className="admin-sidebar-item w-full flex items-center gap-3">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Support</span>
        </button>
        <button className="admin-sidebar-item w-full flex items-center gap-3" onClick={() => signOut()}>
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
