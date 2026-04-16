import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, BarChart3, LayoutGrid, Sparkles,
  ImageIcon, Star, Layers, Users, Settings2, Plug, Separator as SepIcon
} from 'lucide-react';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { useLogoDisplay } from '@/hooks/useLogoDisplay';
import defaultLogo from '@/assets/logo.png';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const mainNav = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Products', url: '/', icon: Package },
  { title: 'Analytics', url: '/scan-analytics', icon: BarChart3 },
  { title: 'Carousels', url: '/admin/carousels', icon: LayoutGrid },
  { title: 'Total Looks', url: '/looks', icon: Sparkles },
  { title: 'Campaign Assets', url: '/admin/media-manager', icon: ImageIcon },
  { title: 'Celebrity Content', url: '/celebrity-content', icon: Star },
  { title: 'Activations', url: '/activations', icon: Layers },
  { title: 'Leads', url: '/leads', icon: Users },
];

const bottomNav = [
  { title: 'API', url: '/api-settings', icon: Plug },
  { title: 'Settings', url: '/settings', icon: Settings2 },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { settings } = usePlatformSettingsContext();
  const logoUrl = settings.logo_url || defaultLogo;
  const { height: logoHeight } = useLogoDisplay();

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarContent className="bg-background">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center justify-center">
          <Link to="/dashboard">
            <img
              src={logoUrl}
              alt={settings.brand_name || 'Brand'}
              style={{ height: Math.min(logoHeight, 36) }}
              className="object-contain"
            />
          </Link>
        </div>

        <Separator className="mx-3 w-auto" />

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-3 w-auto" />

        {/* Bottom nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      to={item.url}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.url)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-4 py-3">
        <p className="text-[10px] text-muted-foreground text-center tracking-wider uppercase">
          Powered by Aitems
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
