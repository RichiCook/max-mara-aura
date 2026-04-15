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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          <h2 className="font-serif text-[22px] font-semibold text-foreground text-center m-0 mb-1">
            Register my product
          </h2>
          <p className="font-sans text-[13px] text-muted-foreground text-center mb-5">
            {productName}
          </p>

          {/* Product image placeholder */}
          <div className="flex items-center justify-center mx-auto mb-6" style={{
            width: 100, height: 100, background: '#f5f0eb', borderRadius: 12,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h3 className="font-sans text-[15px] font-semibold text-foreground text-center m-0 mb-1">
            Enter your purchase PIN code:
          </h3>
          <p className="font-sans text-[12px] text-muted-foreground text-center mb-5">
            Found on your receipt or product card
          </p>

          {/* 9 digit inputs: 3 groups of 3, responsive sizing */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
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
                onFocus={e => e.target.select()}
                className="w-9 h-11 text-center font-sans text-lg font-semibold rounded-lg border-[1.5px] border-border outline-none text-foreground bg-secondary focus:ring-2 focus:ring-primary"
              />
            ))}
            <span className="font-sans text-muted-foreground text-lg mx-0.5">–</span>
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
                onFocus={e => e.target.select()}
                className="w-9 h-11 text-center font-sans text-lg font-semibold rounded-lg border-[1.5px] border-border outline-none text-foreground bg-secondary focus:ring-2 focus:ring-primary"
              />
            ))}
            <span className="font-sans text-muted-foreground text-lg mx-0.5">–</span>
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
                onFocus={e => e.target.select()}
                className="w-9 h-11 text-center font-sans text-lg font-semibold rounded-lg border-[1.5px] border-border outline-none text-foreground bg-secondary focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          {/* Checkbox */}
          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: '#E12B38', width: 16, height: 16 }}
            />
            <span className="font-sans text-[12px] text-muted-foreground leading-relaxed">
              I confirm that I have read and agree with the Terms and Conditions and that I am aware that once the pin code is activated, no returns or changes are allowed.
            </span>
          </label>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full font-sans text-[15px] font-semibold border-none rounded-[10px] py-4 transition-colors"
            style={{
              background: canSubmit ? '#E12B38' : '#e8e8e8',
              color: canSubmit ? '#fff' : '#bbb',
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            Register Ownership
          </button>

          <p className="font-sans text-[12px] text-accent text-center mt-3.5 cursor-pointer">
            Need help?
          </p>

          <p className="font-sans text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
            We advise that once the above pin code is activated, the ownership of this product will be certified as a part of its traceability journey. As a result, Christian Louboutin will then no longer be able to accept returns or exchanges for this item.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimOwnershipModal;
