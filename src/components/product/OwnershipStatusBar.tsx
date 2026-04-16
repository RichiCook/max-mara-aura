import auraLogoWhite from '@/assets/aura-logo-white.png';

interface OwnershipStatusBarProps {
  onClick: () => void;
}

const OwnershipStatusBar = ({ onClick }: OwnershipStatusBarProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3"
      style={{
        background: '#E12B38',
        padding: '18px 20px',
        border: 'none',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      <img src={auraLogoWhite} alt="Aura Blockchain" className="w-9 h-9 shrink-0 object-contain" />
      <div className="flex-1 text-left min-w-0">
        <span className="font-sans text-[18px] font-semibold block">
          View ownership status
        </span>
        <span className="font-mono text-[14px] opacity-75 block mt-0.5 truncate">
          ID : 4A7F92B1C3E800000024
        </span>
      </div>
      <span className="text-2xl opacity-70 shrink-0">&rsaquo;</span>
    </button>
  );
};

export default OwnershipStatusBar;
