import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  /** Optional: callback to refetch products after Excel import (legacy, unused) */
  onImportComplete?: () => void;
  /** Optional: extra content (titles, back links) to render inline */
  children?: React.ReactNode;
}

/**
 * AppHeader renders inline children (page titles, back links) and a sign-out
 * button for authenticated admins. The desktop sidebar and mobile top bar are
 * provided by AdminSidebar.
 */
export const AppHeader = ({ children }: AppHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex items-center gap-4 flex-1 min-w-0">{children}</div>
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      )}
    </div>
  );
};
