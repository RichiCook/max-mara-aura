interface GenuineProductBannerProps {
  productName: string;
  collection?: string | null;
  onViewPassport: () => void;
}

const GenuineProductBanner = ({ productName, collection, onViewPassport }: GenuineProductBannerProps) => {
  return (
    <div 
      className="animate-in"
      style={{
        margin: '8px 12px 0',
        padding: '16px 18px',
        background: '#fff',
        borderRadius: '6px',
        border: '1px solid #e4e0db',
        boxShadow: '0 1px 10px rgba(0,0,0,0.025)',
      }}
    >
      {/* Badges */}
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#166534',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          ✓ Genuine Product
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20, background: '#FEF3C7', color: '#92400E',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          ⬡ Aura Certified
        </span>
      </div>

      {/* Product name */}
      <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginTop: '4px', lineHeight: 1.3 }}>
        {productName}
      </h1>

      {/* Origin line */}
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#b5ada5', marginTop: '4px' }}>
        Made in Italy{collection ? ` · ${collection}` : ''}
      </p>
    </div>
  );
};

export default GenuineProductBanner;
