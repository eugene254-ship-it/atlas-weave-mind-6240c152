import { type WorldEntity, entityTypeConfig } from '@/data/worldModelData';
import { SystemStateBadge, ConfidenceIndicator } from './SystemStateBadge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  entity: WorldEntity;
  onClick?: () => void;
  isSelected?: boolean;
}

const trendIcon = (t: 'up' | 'down' | 'stable') =>
  t === 'up' ? <TrendingUp className="h-3 w-3" /> :
  t === 'down' ? <TrendingDown className="h-3 w-3" /> :
  <Minus className="h-3 w-3" />;

export function EntityCard({ entity, onClick, isSelected }: Props) {
  const config = entityTypeConfig[entity.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-all
        ${isSelected
          ? 'border-primary/40 glow-primary bg-card'
          : 'border-border/50 bg-card/60 hover:border-primary/20 hover:bg-card'
        }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">{entity.name}</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{config.label}</span>
          </div>
        </div>
        <SystemStateBadge status={entity.status} pulse={entity.status === 'critical'} />
      </div>

      <p className="mb-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{entity.description}</p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {entity.metrics.slice(0, 4).map(m => (
          <div key={m.label} className="rounded-md bg-muted/50 px-2 py-1.5">
            <div className="font-mono text-[10px] text-muted-foreground">{m.label}</div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs font-medium text-foreground">{m.value}</span>
              <span className={m.trend === 'up' ? 'text-status-stressed' : m.trend === 'down' ? 'text-status-critical' : 'text-muted-foreground'}>
                {trendIcon(m.trend)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <ConfidenceIndicator level={entity.confidence} />
        <span className="font-mono text-[10px] text-muted-foreground">
          {entity.risks.length} risks · {entity.dependents.length} dependents
        </span>
      </div>
    </motion.div>
  );
}
