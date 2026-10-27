import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AitemzDashboard from "./pages/AitemzDashboard";
import ImportPage from "./pages/ImportPage";
import NotFound from "./pages/NotFound";
import ProductPageRouter from "./pages/ProductPageRouter";
import ProductEditPage from "./pages/ProductEditPage";
import ActivationsPage from "./pages/ActivationsPage";
import ShortUrlRedirect from "./pages/ShortUrlRedirect";
import LooksPage from "./pages/LooksPage";
import LookGroupsSettingsPage from "./pages/LookGroupsSettingsPage";
import AIGenerationSettingsPage from "./pages/AIGenerationSettingsPage";
import LeadsPage from "./pages/LeadsPage";
import ApiSettingsPage from "./pages/ApiSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import ThemeSettingsPage from "./pages/ThemeSettingsPage";
import ScanAnalyticsPage from "./pages/ScanAnalyticsPage";
import CelebrityContentPage from "./pages/CelebrityContentPage";
import AdminMediaManager from "./pages/AdminMediaManager";
import ImageReviewPage from "./pages/ImageReviewPage";
import CarouselSettingsPage from "./pages/CarouselSettingsPage";

import ProductsAdminPage from "./pages/ProductsAdminPage";
import ProductAdminDetailPage from "./pages/ProductAdminDetailPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AccountPage from "./pages/AccountPage";
import LookSharePage from "./pages/LookSharePage";
import LookShortRedirect from "./pages/LookShortRedirect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PlatformSettingsProvider } from "./contexts/PlatformSettingsContext";
import { AdminLayout } from "./layouts/AdminLayout";

const queryClient = new QueryClient();

/** Wrap admin pages: PlatformSettings + Auth gate + Teal Curator theme */
const Admin = ({ children }: { children: React.ReactNode }) => (
  <PlatformSettingsProvider>
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  </PlatformSettingsProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - QR scans outside PlatformSettingsProvider for performance */}
          <Route path="/p/:code" element={<ShortUrlRedirect />} />
          <Route path="/l/:code" element={<PlatformSettingsProvider><LookShortRedirect /></PlatformSettingsProvider>} />
          
          {/* All other routes wrapped in PlatformSettingsProvider */}
          <Route path="/product/:slug" element={<PlatformSettingsProvider><ProductPageRouter /></PlatformSettingsProvider>} />
          <Route path="/auth" element={<PlatformSettingsProvider><AuthPage /></PlatformSettingsProvider>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/account" element={<PlatformSettingsProvider><AccountPage /></PlatformSettingsProvider>} />
          <Route path="/look/share" element={<PlatformSettingsProvider><LookSharePage /></PlatformSettingsProvider>} />
          
          
          {/* Protected dashboard routes — Teal Curator admin theme */}
          <Route path="/" element={<Admin><AitemzDashboard /></Admin>} />
          <Route path="/import" element={<Admin><ImportPage /></Admin>} />
          <Route path="/products" element={<Admin><ProductsAdminPage /></Admin>} />
          <Route path="/products/:id" element={<Admin><ProductAdminDetailPage /></Admin>} />
          <Route path="/product/:slug/edit" element={<Admin><ProductEditPage /></Admin>} />
          <Route path="/activations" element={<Admin><ActivationsPage /></Admin>} />
          <Route path="/looks" element={<Admin><LooksPage /></Admin>} />
          <Route path="/looks/settings" element={<Admin><LookGroupsSettingsPage /></Admin>} />
          <Route path="/looks/ai-settings" element={<Admin><AIGenerationSettingsPage /></Admin>} />
          <Route path="/leads" element={<Admin><LeadsPage /></Admin>} />
          <Route path="/api-settings" element={<Admin><ApiSettingsPage /></Admin>} />
          <Route path="/settings" element={<Admin><SettingsPage /></Admin>} />
          <Route path="/settings/theme" element={<Admin><ThemeSettingsPage /></Admin>} />
          <Route path="/scan-analytics" element={<Admin><ScanAnalyticsPage /></Admin>} />
          <Route path="/celebrity-content" element={<Admin><CelebrityContentPage /></Admin>} />
          <Route path="/admin/media-manager" element={<Admin><AdminMediaManager /></Admin>} />
          <Route path="/admin/media-manager" element={<Admin><AdminMediaManager /></Admin>} />
          <Route path="/admin/image-review" element={<Admin><ImageReviewPage /></Admin>} />

          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
