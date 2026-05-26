import { useEffect, useState, useRef } from 'react';
import { useModalScrollLock } from '@/hooks/useModalScrollLock';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import { usePlatformSettingsContext } from '@/contexts/PlatformSettingsContext';

interface AuraLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const BRAND_BROWN = '#8B5E3C';
const BRAND_MUTED = '#A0846B';

const AuraLoginModal = ({ open, onClose, onLoginSuccess }: AuraLoginModalProps) => {
  const { settings } = usePlatformSettingsContext();
  const brandLabel = (settings.brand_name || 'Studio').toUpperCase();
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { dragY, handleTouchStart, handleTouchMove, handleTouchEnd, reset } = useSwipeToDismiss(onClose, scrollRef);

  useModalScrollLock(visible);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setEmail(''); setPassword(''); setName(''); setIsRegister(false); setShowPassword(false);
      reset();
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      reset();
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [open, reset]);

  if (!visible) return null;

  const canSubmit = email.trim() && password.trim() && (!isRegister || name.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    localStorage.setItem('aura_owner_name', isRegister ? name : email.split('@')[0]);
    onLoginSuccess();
  };

  const backdropOpacity = animating ? Math.max(0, 1 - dragY / 300) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: `rgba(0,0,0,${0.6 * backdropOpacity})`, zIndex: 10001,
        opacity: animating || dragY > 0 ? 1 : 0, transition: dragY > 0 ? 'none' : 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
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
              {isRegister ? 'Register' : 'Create an account'}
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ✕
            </button>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: BRAND_MUTED, textTransform: 'uppercase', marginTop: 4 }}>
            MY {brandLabel}
          </p>
        </div>

        {/* Content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '20px 20px 32px' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#1a1a1a', marginBottom: 24, lineHeight: 1.4 }}>
            {isRegister ? 'Please provide your details to register' : 'Please provide your details to create an account'}
          </p>

          {isRegister && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#1a1a1a',
                  border: 'none', borderBottom: `1.5px solid #e0e0e0`, padding: '10px 0',
                  outline: 'none', background: 'transparent',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#1a1a1a',
                border: 'none', borderBottom: `1.5px solid #e0e0e0`, padding: '10px 0',
                outline: 'none', background: 'transparent',
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#1a1a1a',
                  border: 'none', borderBottom: `1.5px solid #e0e0e0`, padding: '10px 0',
                  paddingRight: 100, outline: 'none', background: 'transparent',
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', color: BRAND_MUTED, textTransform: 'uppercase',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                }}
              >
                {showPassword ? 'HIDE PASSWORD' : 'VIEW PASSWORD'}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div style={{ textAlign: 'right', marginBottom: 28 }}>
              <button style={{
                fontFamily: "'Inter', sans-serif", fontSize: 12, color: BRAND_MUTED,
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}>
                Forgot password
              </button>
            </div>
          )}

          {isRegister && <div style={{ height: 20 }} />}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
              background: canSubmit ? BRAND_BROWN : 'transparent',
              color: canSubmit ? '#fff' : '#999',
              border: canSubmit ? 'none' : `1.5px solid #e0e0e0`,
              borderRadius: 10, padding: '15px 0', cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
          >
            {isRegister ? 'Register' : 'Login'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => setIsRegister(!isRegister)}
              style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, color: BRAND_BROWN,
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {isRegister ? 'Already have an account? Login' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuraLoginModal;
