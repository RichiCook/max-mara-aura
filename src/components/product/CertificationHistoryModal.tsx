import { useEffect, useState } from 'react';

interface CertificationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  ownerRegistered?: boolean;
  claimDate?: string | null;
}

const CertificationHistoryModal = ({ open, onClose, productName, ownerRegistered, claimDate }: CertificationHistoryModalProps) => {
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

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const fullTimestamp = `${dateStr}, ${timeStr}`;

  const rows = ownerRegistered
    ? [
        { date: claimDate || fullTimestamp, event: 'Ownership Registration', status: 'Success' },
        { date: fullTimestamp, event: 'Token Creation', status: 'Success' },
        { date: fullTimestamp, event: 'Purchase', status: 'Success' },
      ]
    : [
        { date: fullTimestamp, event: 'Token Creation', status: 'Success' },
        { date: fullTimestamp, event: 'Purchase', status: 'Success' },
      ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000,
        opacity: animating ? 1 : 0, transition: 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
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
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
              Certification History
            </span>
            <button onClick={onClose} style={{ fontSize: 18, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              ⤢
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#999', marginBottom: 20 }}>
            {productName}
          </p>

          <div style={{ borderRadius: 10, border: '1px solid #f0ece7', overflow: 'hidden' }}>
            <div className="grid grid-cols-3" style={{ background: '#faf8f5', padding: '10px 14px', borderBottom: '1px solid #f0ece7' }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Status</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 items-center" style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid #f0ece7' : 'none' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#888' }}>{row.date}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: '#1a1a1a' }}>{row.event}</span>
                <div className="flex items-center justify-end gap-1.5">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf', display: 'inline-block' }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#2dd4bf', fontWeight: 500 }}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#aaa', marginTop: 16, lineHeight: 1.6 }}>
            Disclaimer: The Aura Blockchain Consortium provides the solution to issue this certificate. The content of this certificate is under the sole responsibility of the entity that has commercialised the product covered by the certificate.
          </p>

          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: 20, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
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

export default CertificationHistoryModal;
