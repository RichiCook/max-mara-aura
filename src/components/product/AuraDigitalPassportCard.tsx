interface AuraDigitalPassportCardProps {
  onOpenPassport: () => void;
  ownerRegistered?: boolean;
}

const AuraDigitalPassportCard = ({ onOpenPassport, ownerRegistered }: AuraDigitalPassportCardProps) => {
  return (
    <div
      className="animate-in"
      style={{
        margin: '12px 16px 0',
        padding: '16px',
        background: '#fff',
        borderRadius: 10,
        border: '1.5px solid #C4A265',
        boxShadow: '0 2px 12px rgba(196,162,101,0.1)',
      }}
    >
      {/* Header */}
      <button
        onClick={onOpenPassport}
        className="flex items-center w-full"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4A265" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
        </svg>
        <div className="flex-1" style={{ marginLeft: 10 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a1a', display: 'block' }}>
            Digital Passport Available
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#C4A265', display: 'block', marginTop: 1 }}>
            <a href="https://auraconsortium.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#C4A265', textDecoration: 'none' }}>
              Aura Blockchain Consortium
            </a>
          </span>
        </div>
        {ownerRegistered && (
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#166534',
            marginRight: 8,
          }}>
            Claimed
          </span>
        )}
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#C4A265" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M1 1l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
};

export default AuraDigitalPassportCard;
