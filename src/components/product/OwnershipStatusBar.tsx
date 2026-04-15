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
        padding: '14px 16px',
        border: 'none',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      {/* Shield icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      <div className="flex-1 text-left">
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, display: 'block' }}>
          View ownership status
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.75, display: 'block', marginTop: 2 }}>
          ID : 4A7F92B1C3E800000024
        </span>
      </div>
      <span style={{ fontSize: 20, opacity: 0.7 }}>›</span>
    </button>
  );
};

export default OwnershipStatusBar;
