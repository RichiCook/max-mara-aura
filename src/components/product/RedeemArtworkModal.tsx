import { useEffect, useState } from 'react';

interface RedeemArtworkModalProps {
  open: boolean;
  onClose: () => void;
}

const BRAND_BROWN = '#8B5E3C';

const WALLETS = [
  { name: 'MetaMask', icon: '🦊', color: '#E8831D', badge: 'Popular' },
  { name: 'Coinbase Wallet', icon: '🔵', color: '#0052FF', badge: null },
  { name: 'WalletConnect', icon: '🔗', color: '#3B99FC', badge: null },
  { name: 'Fortmatic', icon: '🟪', color: '#6851FF', badge: null },
];

const RedeemArtworkModal = ({ open, onClose }: RedeemArtworkModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10002,
        opacity: animating ? 1 : 0, transition: 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '90vh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ←
            </button>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
              Redeem Digital Artwork
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ⤢
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 32px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px', textAlign: 'center' }}>
            Connect your Digital Wallet
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
            To claim your Digital Artwork, please connect to your digital wallet.
          </p>

          {/* Wallet options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {WALLETS.map(wallet => (
              <button
                key={wallet.name}
                style={{
                  width: '100%', fontFamily: "'Inter', sans-serif",
                  background: '#fff', border: '1.5px solid #f0ece7', borderRadius: 12,
                  padding: '16px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = BRAND_BROWN)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#f0ece7')}
              >
                <span style={{ fontSize: 24 }}>{wallet.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', flex: 1, textAlign: 'left' }}>
                  {wallet.name}
                </span>
                {wallet.badge && (
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500,
                    color: '#999', padding: '3px 10px', borderRadius: 20,
                    background: '#f5f5f5',
                  }}>
                    {wallet.badge}
                  </span>
                )}
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1l6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 28 }}>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: BRAND_BROWN,
              background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}>
              Need help?
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RedeemArtworkModal;
