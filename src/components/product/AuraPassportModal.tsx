import { useEffect, useState, useRef, useCallback } from 'react';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';
import { useModalScrollLock } from '@/hooks/useModalScrollLock';
import defaultLogo from '@/assets/logo.png';

interface AuraPassportModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productCode?: string | null;
  ownerRegistered?: boolean;
  onOpenClaim: () => void;
  onOpenTransfer: () => void;
  onOpenRedeem: () => void;
  claimDate?: string | null;
}

const SWIPE_THRESHOLD = 80;

const T = {
  bgDark: '#2C1F17',
  gold: '#C9A96E',
  textPrimary: '#FFFFFF',
  textSecondary: '#9B9B9B',
  textCream: '#F5F1EA',
  textMutedCream: '#B8B0A5',
  borderSubtle: 'rgba(201, 169, 110, 0.25)',
  fontSerif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  fontSans: "'Inter', sans-serif",
  green: '#2dd4bf',
};

const AuraPassportModal = ({
  open, onClose, productName, productCode, ownerRegistered,
  onOpenClaim, onOpenTransfer, onOpenRedeem, claimDate,
}: AuraPassportModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { settings } = usePlatformSettingsContext();
  const logoUrl = settings.logo_url || defaultLogo;

  useModalScrollLock(visible);

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
    if (el.scrollTop > 5) return;
    dragStart.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStart.current === null) return;
    const delta = e.touches[0].clientY - dragStart.current;
    if (delta > 0) setDragY(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStart.current === null) return;
    if (dragY > SWIPE_THRESHOLD) onClose();
    else setDragY(0);
    dragStart.current = null;
  }, [dragY, onClose]);

  if (!visible) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const fullTimestamp = `${dateStr}, ${timeStr}`;
  const ownerName = localStorage.getItem('aura_owner_name') || 'Owner';

  const historyRows = ownerRegistered
    ? [
        { date: claimDate || fullTimestamp, event: 'Ownership Registration', status: 'Success' },
        { date: fullTimestamp, event: 'Token Creation', status: 'Success' },
        { date: fullTimestamp, event: 'Purchase', status: 'Success' },
      ]
    : [
        { date: fullTimestamp, event: 'Token Creation', status: 'Success' },
        { date: fullTimestamp, event: 'Purchase', status: 'Success' },
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
          maxHeight: '90dvh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transform: animating ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragY > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* ═══ DARK SECTION ═══ */}
        <div style={{ background: T.bgDark, flexShrink: 0, textAlign: 'center' }}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '12px auto 0' }} />

          <div style={{ padding: '0 20px 40px' }}>
            {/* Brand logo */}
            <div style={{ marginTop: 28 }}>
              <img
                src={logoUrl}
                alt={settings.brand_name || 'Brand'}
                style={{ height: 36, margin: '0 auto', display: 'block', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </div>

            {/* Product name */}
            <p style={{
              fontFamily: T.fontSerif, fontSize: 27, fontWeight: 400,
              color: T.textCream, margin: '24px 0 0', lineHeight: 1.2,
            }}>
              {productName}
            </p>

            {/* Gold divider */}
            <div style={{ width: 40, height: 1, background: T.gold, margin: '16px auto' }} />

            {/* Certification label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <img src={auraLogoGreen} alt="Aura" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
              <span style={{
                fontFamily: T.fontSans, fontSize: 10, fontWeight: 600,
                letterSpacing: '0.15em', color: T.textSecondary, textTransform: 'uppercase',
              }}>
                Certified by Aura Blockchain Consortium
              </span>
            </div>

            {/* ── Body: Unclaimed ── */}
            {!ownerRegistered && (
              <div style={{ marginTop: 48 }}>
                <p style={{
                  fontFamily: T.fontSerif, fontSize: 15, fontWeight: 300,
                  color: T.textMutedCream, margin: '0 0 32px', lineHeight: 1.5,
                }}>
                  This item has not been claimed.
                </p>

                <button
                  onClick={() => { onClose(); setTimeout(onOpenClaim, 200); }}
                  style={{
                    fontFamily: T.fontSerif, fontSize: 14, fontWeight: 500,
                    background: T.textCream, color: '#2C1F17', border: 'none', borderRadius: 5,
                    padding: '16px 32px', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: 8, margin: '0 auto',
                  }}
                >
                  Claim ownership
                  <img src={auraLogoGreen} alt="Aura" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                </button>

                <div style={{ marginTop: 24 }}>
                  <a
                    href="https://auraconsortium.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: T.fontSerif, fontSize: 12, fontWeight: 400,
                      color: T.gold, textDecoration: 'underline', textUnderlineOffset: 3,
                    }}
                  >
                    About Aura Blockchain Consortium
                  </a>
                </div>
              </div>
            )}

            {/* ── Body: Claimed ── */}
            {ownerRegistered && (
              <div style={{ marginTop: 32 }}>
                <div style={{ maxWidth: 280, margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 0 8px', borderBottom: `1px solid ${T.borderSubtle}` }}>
                    <span style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: T.textSecondary, textTransform: 'uppercase' }}>
                      Name
                    </span>
                    <span style={{ fontFamily: T.fontSerif, fontSize: 15, color: T.textCream, fontWeight: 400 }}>
                      Mr {ownerName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 8px', borderBottom: `1px solid ${T.borderSubtle}` }}>
                    <span style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: T.textSecondary, textTransform: 'uppercase' }}>
                      Date
                    </span>
                    <span style={{ fontFamily: T.fontSerif, fontSize: 15, color: T.textCream, fontWeight: 400 }}>
                      {claimDate || fullTimestamp}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
                  <button
                    onClick={() => {}}
                    style={{
                      fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                      background: 'transparent', color: T.textPrimary,
                      border: `1px solid ${T.borderSubtle}`, borderRadius: 5,
                      padding: '14px 0', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    Add certificate to your wallet
                  </button>
                  <button
                    onClick={() => { onClose(); setTimeout(onOpenRedeem, 200); }}
                    style={{
                      fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                      background: 'transparent', color: T.textPrimary,
                      border: `1px solid ${T.borderSubtle}`, borderRadius: 5,
                      padding: '14px 0', cursor: 'pointer',
                    }}
                  >
                    Redeem the Digital Artwork
                  </button>
                  <button
                    onClick={() => { onClose(); setTimeout(onOpenTransfer, 200); }}
                    style={{
                      fontFamily: T.fontSans, fontSize: 13, fontWeight: 500,
                      background: 'transparent', color: T.textPrimary,
                      border: `1px solid ${T.borderSubtle}`, borderRadius: 5,
                      padding: '14px 0', cursor: 'pointer',
                    }}
                  >
                    Transfer ownership
                  </button>
                </div>

                <div style={{ marginTop: 24 }}>
                  <a
                    href="https://auraconsortium.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: T.fontSerif, fontSize: 12, fontWeight: 400,
                      color: T.gold, textDecoration: 'underline', textUnderlineOffset: 3,
                    }}
                  >
                    About Aura Blockchain Consortium
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ WHITE SECTION — Certification History ═══ */}
        <div ref={sheetRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>
          <h3 style={{ fontFamily: T.fontSerif, fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 16px' }}>
            Certification History
          </h3>

          {productCode && (
            <p style={{ fontFamily: T.fontSans, fontSize: 11, color: '#999', margin: '-8px 0 16px' }}>
              SKU: {productCode}
            </p>
          )}

          <div style={{ borderRadius: 8, border: '1px solid #f0ece7', overflow: 'hidden' }}>
            <div className="grid grid-cols-3" style={{ background: '#faf8f5', padding: '10px 14px', borderBottom: '1px solid #f0ece7' }}>
              <span style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event</span>
              <span style={{ fontFamily: T.fontSans, fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Status</span>
            </div>
            {historyRows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 items-center" style={{ padding: '12px 14px', borderBottom: i < historyRows.length - 1 ? '1px solid #f0ece7' : 'none' }}>
                <span style={{ fontFamily: T.fontSans, fontSize: 11, color: '#888' }}>{row.date}</span>
                <span style={{ fontFamily: T.fontSans, fontSize: 11, fontWeight: 500, color: '#1a1a1a' }}>{row.event}</span>
                <div className="flex items-center justify-end gap-1.5">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
                  <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.green, fontWeight: 500 }}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: T.fontSans, fontSize: 10, color: '#aaa', marginTop: 16, lineHeight: 1.6 }}>
            Disclaimer: The Aura Blockchain Consortium provides the solution to issue this certificate. The content of this certificate is under the sole responsibility of the entity that has commercialised the product covered by the certificate.
          </p>
        </div>

        {/* Close button — sticky footer */}
        <div style={{ padding: '12px 20px 24px', flexShrink: 0, background: '#fff' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', fontFamily: T.fontSans, fontSize: 14, fontWeight: 500,
              background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 24,
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
