interface GenuineProductBannerProps {
  productName: string;
  collection?: string | null;
  onViewPassport: () => void;
}

const GenuineProductBanner = ({ productName, collection }: GenuineProductBannerProps) => {
  return (
    <div className="px-5 md:px-0">
      {/* Eyebrow line */}
      <div className="flex items-center gap-1.5 mt-6 mb-3">
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: '#97C459' }} />
        <span
          className="font-sans uppercase"
          style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', color: '#8A8178' }}
        >
          Genuine product
        </span>
        <span style={{ color: '#D4CFC5', fontSize: 10 }}>·</span>
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: '#C9A96E' }} />
        <span
          className="font-sans uppercase"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: '#C9A96E' }}
        >
          Aura certified
        </span>
      </div>

      {/* Product name */}
      <h1
        className="font-serif text-foreground"
        style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.1 }}
      >
        {productName}
      </h1>

      {/* Origin subtitle */}
      <p
        className="font-serif italic mt-1.5"
        style={{ fontSize: 13, color: '#8A8178' }}
      >
        Made in Italy{collection ? ` · ${collection}` : ''}
      </p>
    </div>
  );
};

export default GenuineProductBanner;
