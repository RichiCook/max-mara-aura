import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionRow } from '@/hooks/useScanAnalytics';
import { format } from 'date-fns';
import { MapPin, Clock, Layers } from 'lucide-react';
import { ProductInfo } from './ProductCell';
import { Link } from 'react-router-dom';

interface Props {
  sessions: SessionRow[];
  productByCode?: Map<string, ProductInfo>;
}

export function SessionsList({ sessions, productByCode }: Props) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((s, i) => (
        <Card key={i}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{s.sessionId}</span>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Layers className="w-3 h-3" />
                    {s.eventCount} events
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.products.map(p => {
                    const info = productByCode?.get(p);
                    const chip = (
                      <div
                        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full"
                        style={{ background: 'var(--admin-surface-container-high)' }}
                      >
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden shrink-0"
                          style={{ background: 'var(--admin-surface-container)' }}
                        >
                          {info?.image ? (
                            <img src={info.image} alt={info.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <span
                          className="text-xs font-medium truncate max-w-[140px]"
                          style={{ color: 'var(--admin-text-primary)' }}
                        >
                          {info?.name ?? p}
                        </span>
                      </div>
                    );
                    return info ? (
                      <Link key={p} to={`/product/${info.slug}`} target="_blank" rel="noopener" className="hover:opacity-80 transition-opacity">
                        {chip}
                      </Link>
                    ) : (
                      <div key={p}>{chip}</div>
                    );
                  })}
                </div>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {s.location !== '—' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <MapPin className="w-3 h-3" />
                    {s.location}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                  <Clock className="w-3 h-3" />
                  {format(new Date(s.lastSeen), 'MMM d, HH:mm')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
