import { useEffect, useState, useRef, useCallback } from 'react';

interface ClaimOwnershipModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  onSuccess: () => void;
}

const ClaimOwnershipModal = ({ open, onClose, productName, onSuccess }: ClaimOwnershipModalProps) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(9).fill(''));
  const [agreed, setAgreed] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setDigits(Array(9).fill(''));
      setAgreed(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

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

  const inputStyle: React.CSSProperties = {
    width: 38, height: 48, textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 600,
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    outline: 'none', color: '#1a1a1a', background: '#faf8f5',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10001,
        opacity: animating ? 1 : 0, transition: 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
        {/* Handle + close */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
            <button onClick={onClose} style={{ fontSize: 20, color: '#ccc', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px', textAlign: 'center' }}>
            Register my product
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 20 }}>
            {productName}
          </p>

          {/* Product image placeholder */}
          <div style={{
            width: 120, height: 120, margin: '0 auto 24px',
            background: '#f5f0eb', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#1a1a1a', textAlign: 'center', margin: '0 0 4px' }}>
            Enter your purchase PIN code:
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 20 }}>
            Found on your receipt or product card
          </p>

          {/* 9 digit inputs: 3 groups of 3 */}
          <div className="flex items-center justify-center gap-2" style={{ marginBottom: 24 }}>
            {[0, 1, 2].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={inputStyle}
                onFocus={e => e.target.select()}
              />
            ))}
            <span style={{ width: 8 }} />
            {[3, 4, 5].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={inputStyle}
                onFocus={e => e.target.select()}
              />
            ))}
            <span style={{ width: 8 }} />
            {[6, 7, 8].map(i => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={inputStyle}
                onFocus={e => e.target.select()}
              />
            ))}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3" style={{ marginBottom: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 3, accentColor: '#E12B38', width: 16, height: 16 }}
            />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              I confirm that I have read and agree with the Terms and Conditions and that I am aware that once the pin code is activated, no returns or changes are allowed.
            </span>
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600,
              background: canSubmit ? '#E12B38' : '#e8e8e8', color: canSubmit ? '#fff' : '#bbb',
              border: 'none', borderRadius: 10, padding: '15px 0', cursor: canSubmit ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            Register Ownership
          </button>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4A265', textAlign: 'center', marginTop: 14, cursor: 'pointer' }}>
            Need help?
          </p>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            We advise that once the above pin code is activated, the ownership of this product will be certified as a part of its traceability journey. As a result, Christian Louboutin will then no longer be able to accept returns or exchanges for this item.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimOwnershipModal;
