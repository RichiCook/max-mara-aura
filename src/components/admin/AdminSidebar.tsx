import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
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
  LayoutDashboard,
  Download,
  BadgeCheck,
  Menu,
  Package,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import aitemzMark from '@/assets/aitemz-mark.svg';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const NAV = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/products', label: 'Products', Icon: Package },
  { to: '/looks', label: 'Total Looks', Icon: Sparkles },
  { to: '/looks/ai-settings', label: 'AI Settings', Icon: Sparkles },
  { to: '/celebrity-content', label: 'Celebrity', Icon: Star },
  { to: '/activations', label: 'Activations', Icon: Layers },
  { to: '/admin/media-manager', label: 'Campaign Assets', Icon: ImageIcon },
  { to: '/admin/image-review', label: 'Image Review', Icon: BadgeCheck },
  { to: '/admin/carousels', label: 'Carousels', Icon: LayoutGrid },
  { to: '/leads', label: 'Leads', Icon: Users },
  { to: '/scan-analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/import', label: 'Import', Icon: Download },
  { to: '/api-settings', label: 'API', Icon: Settings2 },
  { to: '/settings', label: 'Settings', Icon: Palette },
];

const SidebarBody = ({
  brand,
  logoUrl,
  pathname,
  signOut,
  onNavigate,
}: {
  brand: string;
  logoUrl?: string;
  pathname: string;
  signOut: () => void;
  onNavigate?: () => void;
}) => (
  <div className="flex flex-col h-full px-4 py-6">
    <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-2 mb-1">
      {logoUrl ? (
        <img src={logoUrl} alt={brand} className="h-7 shrink-0 object-contain" />
      ) : (
        <img src={aitemzMark} alt={brand} className="w-9 h-6 shrink-0" />
      )}
      <div className="leading-none">
        <div
          style={{
            fontFamily: 'var(--admin-font-display)',
            fontSize: '22px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--admin-black)',
          }}
        >
          {brand}
        </div>
      </div>
    </Link>
    <div
      className="px-2 mb-8"
      style={{
        fontFamily: 'var(--admin-font-mono)',
        fontSize: '8px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: 'var(--admin-grey)',
      }}
    >
      Product Intelligence
    </div>
    <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--admin-ghost-border)' }} />

    <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto -mx-1 px-1">
      {NAV.map(({ to, label, Icon }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
        return (
          <Link key={to} to={to} onClick={onNavigate}>
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

    <div
      className="flex flex-col gap-0.5 pt-4 mt-4"
      style={{ borderTop: '1px solid var(--admin-ghost-border)' }}
    >
      <button className="admin-sidebar-item w-full flex items-center gap-3">
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span>Support</span>
      </button>
      <button
        className="admin-sidebar-item w-full flex items-center gap-3"
        onClick={() => {
          onNavigate?.();
          signOut();
        }}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span>Logout</span>
      </button>
    </div>
  </div>
);

export const AdminSidebar = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const { settings } = usePlatformSettingsContext();
  const brand = settings.brand_name || 'Studio';
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[260px] z-40"
        style={{
          background: 'var(--admin-white)',
          borderRight: '1px solid var(--admin-ghost-border)',
        }}
      >
        <SidebarBody brand={brand} logoUrl={settings.logo_url} pathname={pathname} signOut={signOut} />
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'var(--admin-glass-bg)',
          backdropFilter: 'var(--admin-glass-blur)',
          WebkitBackdropFilter: 'var(--admin-glass-blur)',
          borderBottom: '1px solid var(--admin-ghost-border)',
        }}
      >
        <Link to="/" className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={brand} className="h-6 object-contain" />
          ) : (
            <img src={aitemzMark} alt={brand} className="w-8 h-5" />
          )}
          <span
            style={{
              fontFamily: 'var(--admin-font-display)',
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--admin-black)',
            }}
          >
            {brand}
          </span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="admin-theme p-0 w-[280px]">
            <SidebarBody
              brand={brand}
              logoUrl={settings.logo_url}
              pathname={pathname}
              signOut={signOut}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
};
