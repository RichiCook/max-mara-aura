import { useEffect, useState, useRef, useCallback } from 'react';

interface AuraPassportModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productCode?: string | null;
  ownerRegistered?: boolean;
  onOpenClaim: () => void;
}

const SWIPE_THRESHOLD = 80;

const AuraPassportModal = ({ open, onClose, productName, productCode, ownerRegistered, onOpenClaim }: AuraPassportModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setDragY(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      setDragY(0);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (!el) return;
    // Only allow swipe when scrolled to top
    if (el.scrollTop > 5) return;
    dragStart.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStart.current === null) return;
    if (dragY > SWIPE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStart.current = null;
  }, [dragY, onClose]);

  if (!visible) return null;

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const historyRows = [
    { date: today, event: 'Token Creation', status: 'Success' },
    { date: today, event: 'Purchase', status: 'Success' },
    ...(ownerRegistered ? [{ date: today, event: 'Ownership Registration', status: 'Success' }] : []),
  ];

  const backdropOpacity = animating ? Math.max(0, 1 - dragY / 300) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: `rgba(0,0,0,${0.6 * backdropOpacity})`, zIndex: 10000,
        opacity: animating || dragY > 0 ? 1 : 0, transition: dragY > 0 ? 'none' : 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '92vh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: animating ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragY > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Dark header */}
        <div style={{ background: '#1a1a1a', padding: '24px 20px 20px', flexShrink: 0 }}>
          {/* Handle bar */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', margin: '0 auto 20px' }} />

          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#C4A265', margin: 0 }}>
            Christian Louboutin
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#fff', marginTop: 6, fontWeight: 500 }}>
            {productName}
          </p>
          {productCode && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              SKU: {productCode}
            </p>
          )}

          {/* Gold divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #C4A265, transparent)', margin: '16px 0' }} />

          {/* Aura badge */}
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' as const }}>
              Certified by Aura Blockchain Consortium
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={sheetRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Owner status */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#999', textTransform: 'uppercase' as const }}>
              Owner
            </span>
            <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
              {ownerRegistered ? (
                <>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Owner Registered</span>
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#166534',
                  }}>Ownership Verified</span>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#666' }}>This item has not been claimed</span>
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 20, background: '#FEF3C7', color: '#92400E',
                  }}>Unclaimed</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => { onClose(); setTimeout(onOpenClaim, 200); }}
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                background: '#E12B38', color: '#fff', border: 'none', borderRadius: 10,
                padding: '14px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Claim ownership <span style={{ fontSize: 16 }}>⬡</span>
            </button>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
              background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0e0e0', borderRadius: 10,
              padding: '14px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Add certificate to your wallet <span style={{ fontSize: 16 }}>📱</span>
            </button>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
              background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10,
              padding: '14px 0', cursor: 'pointer',
            }}>
              Redeem the Digital Artwork
            </button>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
              background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10,
              padding: '14px 0', cursor: 'pointer',
            }}>
              Transfer ownership
            </button>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
              background: 'none', color: '#C4A265', border: 'none', padding: '8px 0', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}>
              About Aura Blockchain Consortium
            </button>
          </div>

          {/* Certification History */}
          <div style={{ marginTop: 28, borderTop: '1px solid #f0ece7', paddingTop: 20 }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
              Certification History
            </h3>

            <div style={{ borderRadius: 10, border: '1px solid #f0ece7', overflow: 'hidden' }}>
              {/* Table header */}
              <div className="grid grid-cols-3" style={{ background: '#faf8f5', padding: '10px 14px', borderBottom: '1px solid #f0ece7' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Date</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Event</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'right' as const }}>Status</span>
              </div>
              {historyRows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 items-center" style={{ padding: '12px 14px', borderBottom: i < historyRows.length - 1 ? '1px solid #f0ece7' : 'none' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888' }}>{row.date}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{row.event}</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#2dd4bf', fontWeight: 500 }}>{row.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding: '12px 20px 24px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
              background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 10,
              padding: '14px 0', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuraPassportModal;
