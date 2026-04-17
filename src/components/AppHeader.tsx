import { Link, useLocation } from 'react-router-dom';
import { Bookmark, Layers, Sparkles, Users, Settings2, LogOut, Palette, BarChart3, Menu, Star, ImageIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ExcelImportModal } from '@/components/ExcelImportModal';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { useLogoDisplay } from '@/hooks/useLogoDisplay';
import defaultLogo from '@/assets/logo.png';

interface AppHeaderProps {
  /** Optional: callback to refetch products after Excel import */
  onImportComplete?: () => void;
  /** Optional: extra content to render between logo and burger */
  children?: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'Products', Icon: Bookmark },
  { to: '/leads', label: 'Leads', Icon: Users },
  { to: '/looks', label: 'Total Looks', Icon: Sparkles },
  { to: '/celebrity-content', label: 'Celebrity Content', Icon: Star },
  { to: '/activations', label: 'Activations', Icon: Layers },
  { to: '/admin/media-manager', label: 'Campaign Assets', Icon: ImageIcon },
  { to: '/admin/carousels', label: 'Carousels', Icon: LayoutGrid },
  { to: '/api-settings', label: 'API', Icon: Settings2 },
  { to: '/scan-analytics', label: 'Analytics', Icon: BarChart3 },
  { to: '/settings', label: 'Settings', Icon: Palette },
];

export const AppHeader = ({ onImportComplete, children }: AppHeaderProps) => {
  const { signOut } = useAuth();
  const { settings } = usePlatformSettingsContext();
  const logoUrl = settings.logo_url || defaultLogo;
  const { height: logoHeight, position: logoPosition } = useLogoDisplay();
  const { pathname } = useLocation();

  return (
    <div className="admin-topnav flex items-center justify-between rounded-xl px-4 py-3">
      <div className={`flex items-center gap-4 ${logoPosition === 'center' ? 'flex-1' : ''}`}>
        {logoPosition === 'center' && <div className="w-10" />}
        <Link to="/" className={logoPosition === 'center' ? 'mx-auto' : ''}>
          <img
            src={logoUrl}
            alt={settings.brand_name || 'aitems'}
            style={{ height: logoHeight }}
            className="object-contain"
          />
        </Link>
        {children}
      </div>

      <div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm shadow-sm">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 admin-theme">
            <nav className="flex flex-col gap-1 mt-8">
              {onImportComplete && <ExcelImportModal onImportComplete={onImportComplete} />}
              {NAV_ITEMS.map(({ to, label, Icon }) => {
                const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
                return (
                  <Link key={to} to={to}>
                    <button
                      className={cn(
                        'admin-sidebar-item w-full flex items-center gap-2',
                        isActive && 'active',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  </Link>
                );
              })}
              <button
                className="admin-sidebar-item w-full flex items-center gap-2 mt-2"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
