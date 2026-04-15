import { useEffect, useState } from 'react';

interface CertificationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  ownerRegistered?: boolean;
}

const HISTORY_ROWS = [
  { date: '2024-11-15', event: 'Product Created', details: 'Registered on Aura Blockchain' },
  { date: '2024-11-15', event: 'Certificate Issued', details: 'Digital passport generated' },
];

const CertificationHistoryModal = ({ open, onClose, productName, ownerRegistered }: CertificationHistoryModalProps) => {
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

  const rows = [
    ...HISTORY_ROWS,
    {
      date: ownerRegistered ? new Date().toISOString().split('T')[0] : '—',
      event: 'Ownership Claimed',
      details: ownerRegistered ? 'Owner verified' : 'Pending',
    },
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
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
            <button onClick={onClose} style={{ fontSize: 20, color: '#ccc', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' }}>
            Certification History
          </h2>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: '#999', marginBottom: 20 }}>
            {productName}
          </p>

          <div style={{ borderRadius: 10, border: '1px solid #f0ece7', overflow: 'hidden' }}>
            {/* Table header */}
            <div className="grid grid-cols-3" style={{ background: '#faf8f5', padding: '10px 14px', borderBottom: '1px solid #f0ece7' }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event</span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Details</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 items-center" style={{ padding: '12px 14px', borderBottom: i < rows.length - 1 ? '1px solid #f0ece7' : 'none' }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: '#888' }}>{row.date}</span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>{row.event}</span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: row.details === 'Pending' ? '#C4A265' : '#2dd4bf' }}>{row.details}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              width: '100%', marginTop: 20, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500,
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
