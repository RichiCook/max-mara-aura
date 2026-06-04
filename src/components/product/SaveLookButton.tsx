import { Bookmark, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSavedLooks, SavedLookInput } from '@/hooks/useSavedLooks';

interface Props {
  look: SavedLookInput;
  disabledReason?: string;
  onSaved?: () => void;
  variant?: 'text' | 'icon';
}

const SaveLookButton = ({ look, disabledReason, onSaved, variant = 'text' }: Props) => {
  const { has, save, remove, requiresAuth } = useSavedLooks();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const saved = has(look.product_codes);

  const handleClick = async () => {
    if (disabledReason) return;
    if (requiresAuth) {
      toast.info('Sign in to save looks');
      navigate('/auth', { state: { from: { pathname: window.location.pathname } } });
      return;
    }
    setBusy(true);
    if (saved) {
      await remove(look.product_codes);
      toast.success('Removed from saved');
    } else {
      const { error } = await save(look);
      if (error) toast.error(error.message);
      else {
        toast.success('Look saved');
        onSaved?.();
      }
    }
    setBusy(false);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!!disabledReason}
        title={disabledReason ?? (saved ? 'Remove from saved' : 'Save this look')}
        aria-label={saved ? 'Remove from saved' : 'Save this look'}
        aria-pressed={saved}
        style={{
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          background: saved ? '#1a1a1a' : '#fff',
          color: saved ? '#fff' : '#1a1a1a',
          border: '1px solid #1a1a1a',
          cursor: disabledReason ? 'not-allowed' : 'pointer',
          opacity: disabledReason ? 0.5 : 1,
          padding: 0,
        }}
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!!disabledReason}
      title={disabledReason ?? (saved ? 'Remove from saved' : 'Save this look')}
      aria-pressed={saved}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 6,
        background: disabledReason ? '#e4e0db' : saved ? '#1a1a1a' : '#fff',
        color: saved ? '#fff' : '#1a1a1a',
        border: saved ? 'none' : '1px solid #1a1a1a',
        cursor: disabledReason ? 'not-allowed' : 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        opacity: disabledReason ? 0.6 : 1,
      }}
    >
      {busy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Bookmark className="w-3 h-3" fill={saved ? 'currentColor' : 'none'} />
      )}
      {saved ? 'Saved' : 'Save'}
    </button>
  );
};

export default SaveLookButton;
