interface AppHeaderProps {
  /** Optional: callback to refetch products after Excel import (legacy, unused) */
  onImportComplete?: () => void;
  /** Optional: extra content (titles, back links) to render inline */
  children?: React.ReactNode;
}

/**
 * AppHeader is now a thin wrapper. AdminSidebar provides both the desktop
 * sidebar and the mobile top bar (logo + hamburger), so this component no
 * longer renders its own chrome. We keep it to preserve existing call sites,
 * and still render any children (page titles, back links) inline.
 */
export const AppHeader = ({ children }: AppHeaderProps) => {
  if (!children) return null;
  return <div className="flex items-center gap-4">{children}</div>;
};
