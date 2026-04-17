import { Link } from 'react-router-dom';

export interface ProductInfo {
  name: string;
  image: string | null;
  slug: string;
}

interface Props {
  code: string;
  info?: ProductInfo;
  size?: 'sm' | 'md';
  showCode?: boolean;
}

export function ProductCell({ code, info, size = 'md', showCode = true }: Props) {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const inner = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`${dim} rounded-md overflow-hidden shrink-0`}
        style={{ background: 'var(--admin-surface-container-high)' }}
      >
        {info?.image ? (
          <img src={info.image} alt={info.name} className="w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: 'var(--admin-text-primary)' }}
        >
          {info?.name ?? code}
        </div>
        {showCode && (
          <div
            className="text-[11px] font-mono truncate"
            style={{ color: 'var(--admin-text-tertiary)' }}
          >
            {code}
          </div>
        )}
      </div>
    </div>
  );

  return info ? (
    <Link to={`/product/${info.slug}`} target="_blank" rel="noopener" className="block hover:opacity-80 transition-opacity">
      {inner}
    </Link>
  ) : (
    inner
  );
}
