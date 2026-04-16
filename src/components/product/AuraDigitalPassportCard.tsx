import auraLogoGreen from '@/assets/aura-logo-green.png';

interface AuraDigitalPassportCardProps {
  onOpenPassport: () => void;
  ownerRegistered?: boolean;
}

const AuraDigitalPassportCard = ({ onOpenPassport, ownerRegistered }: AuraDigitalPassportCardProps) => {
  return (
    <div className="px-5 md:px-0">
      <button
        onClick={onOpenPassport}
        className="w-full text-left"
        style={{
          background: '#2C1F17',
          color: '#F5F1EA',
          border: 'none',
          borderRadius: 12,
          padding: '18px 20px',
          margin: '20px 0',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(44, 31, 23, 0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(44, 31, 23, 0.22)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(44, 31, 23, 0.15)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
      >
        <div className="flex items-start justify-between">
          {/* Left: title + consortium */}
          <div className="flex-1 min-w-0">
            <span
              className="font-serif block"
              style={{ fontSize: 18, fontWeight: 500, color: '#F5F1EA', lineHeight: 1.2 }}
            >
              Digital Product Passport
            </span>
            <div className="flex items-center gap-2 mt-2">
              <img
                src={auraLogoGreen}
                alt="Aura Blockchain"
                className="shrink-0 object-contain"
                style={{ height: 18, width: 'auto' }}
              />
              <span
                className="font-sans uppercase"
                style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', color: '#C9A96E' }}
              >
                Aura Blockchain Consortium
              </span>
            </div>
          </div>

          {/* Right: chevron + status */}
          <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            {ownerRegistered !== undefined && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  borderRadius: 999,
                  textTransform: 'capitalize',
                  ...(ownerRegistered
                    ? { background: 'rgba(155, 199, 135, 0.15)', color: '#B5D99A' }
                    : { background: 'rgba(201, 169, 110, 0.15)', color: '#C9A96E' }),
                }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 4, height: 4,
                    background: 'currentColor',
                  }}
                />
                {ownerRegistered ? 'Claimed' : 'Unclaimed'}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

export default AuraDigitalPassportCard;
