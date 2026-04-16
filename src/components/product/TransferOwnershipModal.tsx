import { useEffect, useState } from 'react';

interface TransferOwnershipModalProps {
  open: boolean;
  onClose: () => void;
}

const BRAND_BROWN = '#8B5E3C';

const TransferOwnershipModal = ({ open, onClose }: TransferOwnershipModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (open) {
      setVisible(true); setEmail('');
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
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
              Product Passport
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ⤢
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 32px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#1a1a1a', margin: '0 0 28px', textAlign: 'center' }}>
            Transfer Ownership
          </h2>

          {/* QR Code */}
          <div style={{
            width: 200, height: 200, margin: '0 auto 28px',
            background: '#fff', borderRadius: 12, border: `2px solid ${BRAND_BROWN}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Decorative corner markers */}
            {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', ...pos, width: 28, height: 28,
                border: `3px solid ${BRAND_BROWN}`, borderRadius: 4,
                borderRight: i % 2 === 0 ? 'none' : undefined,
                borderLeft: i % 2 === 1 ? 'none' : undefined,
                borderBottom: i < 2 ? 'none' : undefined,
                borderTop: i >= 2 ? 'none' : undefined,
              }} />
            ))}
            {/* QR pattern placeholder */}
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              {/* Generate a decorative QR-like grid */}
              {Array.from({ length: 15 }, (_, r) =>
                Array.from({ length: 15 }, (_, c) => {
                  const isCorner = (r < 3 && c < 3) || (r < 3 && c > 11) || (r > 11 && c < 3);
                  const show = isCorner || Math.random() > 0.45;
                  if (!show) return null;
                  return (
                    <rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={7} height={7} rx={1}
                      fill={isCorner ? BRAND_BROWN : `${BRAND_BROWN}${Math.random() > 0.3 ? 'CC' : '66'}`}
                    />
                  );
                })
              )}
            </svg>
          </div>

          {/* Email field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Send link via E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="recipient@email.com"
              style={{
                width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#1a1a1a',
                border: 'none', borderBottom: '1.5px solid #e0e0e0', padding: '10px 0',
                outline: 'none', background: 'transparent',
              }}
            />
          </div>

          {/* Send button */}
          <button
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              background: 'transparent', color: '#1a1a1a',
              border: '1.5px solid #e0e0e0', borderRadius: 10,
              padding: '15px 0', cursor: 'pointer',
            }}
          >
            Send
          </button>

          <p style={{ textAlign: 'center', marginTop: 20 }}>
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

export default TransferOwnershipModal;
