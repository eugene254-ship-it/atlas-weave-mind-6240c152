import { type EntityStatus, type ConfidenceLevel } from '@/data/worldModelData';
import { cn } from '@/lib/utils';

const statusLabels: Record<EntityStatus, string> = {
  stable: 'Stable',
  stressed: 'Stressed',
  critical: 'Critical',
  recovering: 'Recovering',
  uncertain: 'Uncertain',
  degraded: 'Degraded',
};

const statusClasses: Record<EntityStatus, string> = {
  stable: 'bg-status-stable/15 text-status-stable border-status-stable/30',
  stressed: 'bg-status-stressed/15 text-status-stressed border-status-stressed/30',
  critical: 'bg-status-critical/15 text-status-critical border-status-critical/30',
  recovering: 'bg-status-recovering/15 text-status-recovering border-status-recovering/30',
  uncertain: 'bg-status-uncertain/15 text-status-uncertain border-status-uncertain/30',
  degraded: 'bg-status-degraded/15 text-status-degraded border-status-degraded/30',
};

interface Props {
  status: EntityStatus;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function SystemStateBadge({ status, size = 'sm', pulse = false }: Props) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-mono font-medium uppercase tracking-wider',
      statusClasses[status],
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
    )}>
      <span className={cn(
        'inline-block rounded-full',
        size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
        `bg-status-${status}`,
        pulse && status === 'critical' && 'animate-node-pulse',
      )} />
      {statusLabels[status]}
    </span>
  );
}

export function ConfidenceIndicator({ level }: { level: ConfidenceLevel }) {
  const bars = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-1 rounded-sm',
              i <= bars ? 'bg-primary/70' : 'bg-muted',
            )}
          />
        ))}
      </span>
      {level}
    </span>
  );
}
