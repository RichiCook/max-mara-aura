import { useEffect, useState, useRef, useCallback } from 'react';
import { useModalScrollLock } from '@/hooks/useModalScrollLock';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';

interface ClaimOwnershipModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productImage?: string | null;
  onSuccess: () => void;
}

const BRAND_BROWN = '#8B5E3C';

const ClaimOwnershipModal = ({ open, onClose, productName, productImage, onSuccess }: ClaimOwnershipModalProps) => {
  const { settings } = usePlatformSettingsContext();
  const brandName = settings.brand_name || 'the brand';
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(9).fill(''));
  const [agreed, setAgreed] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { dragY, handleTouchStart, handleTouchMove, handleTouchEnd, reset } = useSwipeToDismiss(onClose, scrollRef);

  useModalScrollLock(visible);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setDigits(Array(9).fill(''));
      setAgreed(false);
      reset();
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      reset();
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open, reset]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    setDigits(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 8) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const allFilled = digits.every(d => d !== '');
  const canSubmit = allFilled && agreed;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onClose();
    setTimeout(onSuccess, 300);
  };

  if (!visible) return null;

  const backdropOpacity = animating ? Math.max(0, 1 - dragY / 300) : 0;

  const renderDigitGroup = (start: number, end: number) => (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: end - start }, (_, i) => start + i).map(i => (
        <div key={i} className="flex flex-col items-center" style={{ width: 28 }}>
          <input
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i]}
            onChange={e => handleDigitChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onFocus={e => e.target.select()}
            style={{
              width: 28, height: 36, textAlign: 'center',
              fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 600,
              color: '#1a1a1a', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${digits[i] ? BRAND_BROWN : '#ddd'}`,
              outline: 'none', caretColor: BRAND_BROWN,
              transition: 'border-color 0.2s',
            }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: `rgba(0,0,0,${0.6 * backdropOpacity})`, zIndex: 10001,
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
        {/* Drag handle */}
        <div style={{ flexShrink: 0, padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
              Register my product
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '16px 20px 24px' }}>
          {productImage ? (
            <div style={{
              width: 120, height: 160, margin: '0 auto 20px',
              borderRadius: 12, overflow: 'hidden', background: '#f5f0eb',
              padding: 8,
            }}>
              <img src={productImage} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="flex items-center justify-center mx-auto mb-5" style={{
              width: 100, height: 120, background: '#f5f0eb', borderRadius: 12,
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}

          <p className="font-sans text-[13px] text-muted-foreground text-center mb-5">
            {productName}
          </p>

          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a1a', textAlign: 'center', margin: '0 0 4px' }}>
            Enter your purchase PIN code:
          </h3>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 24 }}>
            Found on your receipt or product card
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            {renderDigitGroup(0, 3)}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#ccc', marginTop: -4 }}>–</span>
            {renderDigitGroup(3, 6)}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#ccc', marginTop: -4 }}>–</span>
            {renderDigitGroup(6, 9)}
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: BRAND_BROWN, width: 16, height: 16 }}
            />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              I confirm that I have read and agree with the Terms and Conditions and that I am aware that once the pin code is activated, no returns or changes are allowed.
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              background: canSubmit ? BRAND_BROWN : 'transparent',
              color: canSubmit ? '#fff' : '#999',
              border: canSubmit ? 'none' : '1.5px solid #e0e0e0',
              borderRadius: 10, padding: '15px 0',
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
          >
            Register Ownership
          </button>

          <p style={{ textAlign: 'center', marginTop: 16 }}>
            <button style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: BRAND_BROWN,
              background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}>
              Need help?
            </button>
          </p>

          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            We advise that once the above pin code is activated, the ownership of this product will be certified as a part of its traceability journey. As a result, {brandName} will then no longer be able to accept returns or exchanges for this item.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimOwnershipModal;
