import { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';

interface CheckoutModalProps {
  url: string | null;
  onClose: () => void;
}

const CheckoutModal = ({ url, onClose }: CheckoutModalProps) => {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!url) return;
    setIframeBlocked(false);
    setLoading(true);

    // If iframe doesn't load within 5s, assume blocked
    timeoutRef.current = setTimeout(() => {
      setIframeBlocked(true);
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutRef.current);
  }, [url]);

  const handleIframeLoad = () => {
    clearTimeout(timeoutRef.current);
    setLoading(false);
    // Try to detect if iframe is blocked (cross-origin will throw)
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc === null) {
        setIframeBlocked(true);
      }
    } catch {
      // Cross-origin — means it loaded successfully on external domain
    }
  };

  const handleIframeError = () => {
    clearTimeout(timeoutRef.current);
    setIframeBlocked(true);
    setLoading(false);
  };

  if (!url) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10010,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(440px, 100%)',
          maxHeight: '92vh',
          zIndex: 10011,
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid #f0ece7',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag style={{ width: 16, height: 16, color: '#8b7355' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
              Checkout
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X style={{ width: 18, height: 18, color: '#999' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {loading && !iframeBlocked && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, background: '#fff', zIndex: 2,
            }}>
              <Loader2 style={{ width: 24, height: 24, color: '#8b7355' }} className="animate-spin" />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#b5ada5' }}>
                Loading checkout…
              </span>
            </div>
          )}

          {iframeBlocked ? (
            /* Fallback when iframe is blocked */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', gap: 16, minHeight: 300,
            }}>
              <ShoppingBag style={{ width: 32, height: 32, color: '#c5c0ba' }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#666', textAlign: 'center', margin: 0 }}>
                The checkout will open on the store's website
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 32px', borderRadius: 8,
                  background: '#1a1a1a', color: '#fff',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Continue to Checkout
                <ExternalLink style={{ width: 14, height: 14, opacity: 0.6 }} />
              </a>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={url}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{
                width: '100%',
                height: 'calc(92vh - 52px)',
                border: 'none',
              }}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            />
          )}
        </div>
      </div>
    </>
  );
};

export default CheckoutModal;
