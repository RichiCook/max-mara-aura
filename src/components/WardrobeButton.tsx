import { useNavigate } from 'react-router-dom';
import { Check, Shirt } from 'lucide-react';
import { useWardrobe } from '@/hooks/useWardrobe';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  productId: string;
  className?: string;
}

export const WardrobeButton = ({ productId, className }: Props) => {
  const { has, add, remove, requiresAuth } = useWardrobe();
  const { toast } = useToast();
  const navigate = useNavigate();
  const owned = has(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requiresAuth) {
      toast({
        title: 'Sign in to build your wardrobe',
        description: 'Create an account to keep track of items you own.',
      });
      navigate('/auth', { state: { from: { pathname: window.location.pathname } } });
      return;
    }
    if (owned) {
      await remove(productId);
      toast({ title: 'Removed from your wardrobe' });
    } else {
      const { error } = await add(productId);
      if (error) {
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Added to your wardrobe' });
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center gap-2 w-full rounded-lg font-sans text-[14px] font-medium py-3.5 border transition-colors',
        owned
          ? 'bg-muted text-foreground border-foreground/40'
          : 'bg-background text-foreground border-border hover:bg-muted',
        className
      )}
      aria-pressed={owned}
    >
      {owned ? <Check size={18} strokeWidth={1.75} /> : <Shirt size={18} strokeWidth={1.5} />}
      {owned ? 'In Your Wardrobe' : 'I Own This'}
    </button>
  );
};

export default WardrobeButton;
