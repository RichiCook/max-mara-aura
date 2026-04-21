import { ReactNode, useEffect } from "react";
import "@/styles/admin-theme.css";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * AdminLayout — wraps every admin page with The Teal Curator design system.
 * Adds `.admin-theme` class which scopes both custom CSS variables and
 * remapped shadcn semantic tokens, so existing UI primitives (Button, Card,
 * Input, Table) auto-adopt the teal palette without per-component rewrites.
 *
 * Public-facing routes (product page, /p/:code, /auth) do NOT use this
 * wrapper, so the Louboutin cream/red/gold aesthetic is preserved there.
 */
export const AdminLayout = ({ children }: AdminLayoutProps) => {
  useEffect(() => {
    document.body.classList.add("admin-theme");
    return () => {
      document.body.classList.remove("admin-theme");
    };
  }, []);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <AdminSidebar />
      {/* Main content offset for sticky sidebar on lg+ */}
      <div className="lg:pl-[260px]">{children}</div>
    </div>
  );
};
