import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, Heart, Shirt } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  className?: string;
}

export const UserMenu = ({ className }: Props) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link
        to="/auth"
        className={`inline-flex items-center gap-1.5 text-[13px] font-sans text-foreground hover:opacity-70 ${className ?? ''}`}
      >
        <UserIcon size={16} strokeWidth={1.5} />
        Sign in
      </Link>
    );
  }

  const initial = (user.email?.[0] ?? '?').toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-background text-[13px] font-medium ${className ?? ''}`}
          aria-label="Account menu"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/account?tab=wishlist')}>
          <Heart className="mr-2 h-4 w-4" /> Wishlist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account?tab=wardrobe')}>
          <Shirt className="mr-2 h-4 w-4" /> Wardrobe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account')}>
          <UserIcon className="mr-2 h-4 w-4" /> My Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
