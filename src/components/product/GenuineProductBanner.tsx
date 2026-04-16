interface GenuineProductBannerProps {
  productName: string;
  collection?: string | null;
  onViewPassport: () => void;
}

const GenuineProductBanner = ({ productName, collection, onViewPassport }: GenuineProductBannerProps) => {
  return (
    <div
      className="animate-in mx-3 mt-2 p-4 bg-card rounded-md border border-border"
      style={{ boxShadow: '0 1px 10px rgba(0,0,0,0.025)' }}
    >
      {/* Badges */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="font-sans text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 inline-flex items-center gap-1">
          Genuine Product
        </span>
        <span className="font-sans text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
          Aura Certified
        </span>
      </div>

      {/* Product name */}
      <h1 className="font-serif text-[22px] font-semibold text-foreground mt-1 leading-tight">
        {productName}
      </h1>

      {/* Origin line */}
      <p className="font-sans text-[12px] text-muted-foreground mt-1">
        Made in Italy{collection ? ` · ${collection}` : ''}
      </p>
    </div>
  );
};

export default GenuineProductBanner;
