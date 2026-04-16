import { useEffect, useState } from 'react';
import { useModalScrollLock } from '@/hooks/useModalScrollLock';

interface RegistrationSuccessModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productImage?: string | null;
  onViewPassport: () => void;
}

const T = {
  bgDark: '#2C1F17',
  gold: '#C9A96E',
  textCream: '#F5F1EA',
  textMutedCream: '#B8B0A5',
  fontSerif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  fontSans: "'Inter', sans-serif",
};

const RegistrationSuccessModal = ({ open, onClose, productName, productImage, onViewPassport }: RegistrationSuccessModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useModalScrollLock(visible);

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
          maxHeight: '90dvh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', margin: '12px auto 0', flexShrink: 0 }} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px' }}>
          <p style={{
            fontFamily: T.fontSans, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: T.gold, textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 12,
          }}>
            CERTIFICATION HISTORY
          </p>

          <h2 style={{
            fontFamily: T.fontSerif, fontSize: 22, fontWeight: 600,
            fontStyle: 'italic', color: '#1a1a1a', textAlign: 'center', lineHeight: 1.35, marginBottom: 24,
          }}>
            Congratulations, your ownership of this garment has been registered.
          </h2>

          {/* Product image — contain, not cover */}
          {productImage ? (
            <div style={{
              width: 140, height: 180, margin: '0 auto 20px',
              borderRadius: 12, overflow: 'hidden', background: '#F5F1EA',
              padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={productImage} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div style={{
              width: 100, height: 100, margin: '0 auto 20px',
              background: '#F5F1EA', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.5">
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" strokeLinecap="round"/>
              </svg>
            </div>
          )}

          <p style={{
            fontFamily: T.fontSans, fontSize: 13, color: '#888',
            textAlign: 'center', lineHeight: 1.6, marginBottom: 28,
          }}>
            You can check the transaction status within the product passport's certification history.
          </p>

          {/* View Product Passport */}
          <button
            onClick={() => { onClose(); setTimeout(onViewPassport, 200); }}
            style={{
              width: '100%', maxWidth: 300, margin: '0 auto', display: 'block',
              fontFamily: T.fontSerif, fontSize: 15, fontWeight: 500,
              background: T.bgDark, color: T.textCream, border: 'none', borderRadius: 6,
              padding: '15px 0', cursor: 'pointer', marginBottom: 10,
            }}
          >
            View Product Passport
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%', maxWidth: 300, margin: '0 auto', display: 'block',
              fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
              background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0e0e0', borderRadius: 6,
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
