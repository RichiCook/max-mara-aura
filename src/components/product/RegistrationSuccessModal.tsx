import { useEffect, useState } from 'react';

interface RegistrationSuccessModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productImage?: string | null;
  onViewPassport: () => void;
}

const BRAND_BROWN = '#8B5E3C';

const RegistrationSuccessModal = ({ open, onClose, productName, productImage, onViewPassport }: RegistrationSuccessModalProps) => {
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
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '85vh',
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
              Registration Complete
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ⤢
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: BRAND_BROWN, textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 12,
          }}>
            CERTIFICATION HISTORY
          </p>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600,
            fontStyle: 'italic', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.35, marginBottom: 24,
          }}>
            Congratulations, your ownership of this garment has been registered.
          </h2>

          {/* Product image */}
          {productImage ? (
            <div style={{
              width: 120, height: 160, margin: '0 auto 20px',
              borderRadius: 12, overflow: 'hidden', background: '#f5f0eb',
            }}>
              <img src={productImage} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div style={{
              width: 100, height: 100, margin: '0 auto 20px',
              background: '#f5f0eb', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" strokeLinecap="round"/>
              </svg>
            </div>
          )}

          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#888',
            textAlign: 'center', lineHeight: 1.6, marginBottom: 28,
          }}>
            You can check the transaction status within the product passport's certification history.
          </p>

          {/* Actions */}
          <button
            onClick={() => { onClose(); setTimeout(onViewPassport, 200); }}
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              background: BRAND_BROWN, color: '#fff', border: 'none', borderRadius: 10,
              padding: '15px 0', cursor: 'pointer', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            View Product Passport <span style={{ fontSize: 16 }}>⬡</span>
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
              background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0e0e0', borderRadius: 10,
              padding: '14px 0', cursor: 'pointer',
            }}
          >
            See My Wardrobe
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccessModal;
