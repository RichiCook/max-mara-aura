import { Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  productId: string;
  className?: string;
  size?: number;
  variant?: 'icon' | 'pill';
}

export const WishlistButton = ({ productId, className, size = 20, variant = 'icon' }: Props) => {
  const { has, toggle, isGuest } = useWishlist();
  const { toast } = useToast();
  const active = has(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = await toggle(productId);
    toast({
      title: nowActive ? 'Added to wishlist' : 'Removed from wishlist',
      description: nowActive && isGuest ? 'Sign in to save it to your account.' : undefined,
    });
  };

  if (variant === 'pill') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center justify-center gap-2 w-full rounded-lg font-sans text-[14px] font-medium py-3.5 border transition-colors',
          active
            ? 'bg-foreground text-background border-foreground'
            : 'bg-background text-foreground border-border hover:bg-muted',
          className
        )}
        aria-pressed={active}
      >
        <Heart size={size} fill={active ? 'currentColor' : 'none'} strokeWidth={1.5} />
        {active ? 'Saved to Wishlist' : 'Add to Wishlist'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-background/85 backdrop-blur-sm border border-border/60 p-2 transition-colors hover:bg-background',
        className
      )}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
    >
      <Heart
        size={size}
        className={active ? 'text-foreground' : 'text-foreground/70'}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={1.5}
      />
    </button>
  );
};

export default WishlistButton;
