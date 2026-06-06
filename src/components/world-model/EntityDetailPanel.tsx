import { useMemo, useState } from 'react';
import { type WorldEntity, type WorldRelationship, entities, relationships, entityTypeConfig, type EntityType } from '@/data/worldModelData';
import { SystemStateBadge, ConfidenceIndicator } from './SystemStateBadge';
import { TrendingDown, TrendingUp, Minus, X, AlertTriangle, ArrowRight, Clock, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  entity: WorldEntity | null;
  onClose: () => void;
  onEntitySelect: (id: string) => void;
  onTraceCausal: () => void;
}

const trendIcon = (t: 'up' | 'down' | 'stable') =>
  t === 'up' ? <TrendingUp className="h-3 w-3" /> :
  t === 'down' ? <TrendingDown className="h-3 w-3" /> :
  <Minus className="h-3 w-3" />;

const timelineTypeStyle: Record<string, string> = {
  info: 'border-primary/30 bg-primary/10',
  warning: 'border-status-stressed/30 bg-status-stressed/10',
  critical: 'border-status-critical/30 bg-status-critical/10',
  recovery: 'border-status-recovering/30 bg-status-recovering/10',
};

export function EntityDetailPanel({ entity, onClose, onEntitySelect, onTraceCausal }: Props) {
  const [relSearch, setRelSearch] = useState('');
  const [relTypeFilter, setRelTypeFilter] = useState<EntityType | 'all'>('all');

  const config = entity ? entityTypeConfig[entity.type] : null;
  const deps = entity ? entities.filter(e => entity.dependencies.includes(e.id)) : [];
  const depnts = entity ? entities.filter(e => entity.dependents.includes(e.id)) : [];
  const rels = entity ? relationships.filter(r => r.source === entity.id || r.target === entity.id) : [];

  const matchesFilter = (e: WorldEntity) => {
    if (relTypeFilter !== 'all' && e.type !== relTypeFilter) return false;
    if (relSearch && !e.name.toLowerCase().includes(relSearch.toLowerCase())) return false;
    return true;
  };

  const filteredDeps = useMemo(() => deps.filter(matchesFilter), [deps, relSearch, relTypeFilter]);
  const filteredDepnts = useMemo(() => depnts.filter(matchesFilter), [depnts, relSearch, relTypeFilter]);
  const filteredRels = useMemo(() => rels.filter(r => {
    const other = entities.find(e => e.id === (r.source === entity?.id ? r.target : r.source));
    return other ? matchesFilter(other) : false;
  }), [rels, relSearch, relTypeFilter, entity?.id]);

  const relatedTypes = useMemo(() => {
    const set = new Set<EntityType>();
    [...deps, ...depnts].forEach(e => set.add(e.type));
    return Array.from(set);
  }, [deps, depnts]);

  if (!entity || !config) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={entity.id}
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex h-full w-[420px] flex-col border-l border-border/50 bg-card/95 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">{entity.name}</h2>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{config.label} · {entity.location || 'Global'}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Status */}
          <div className="flex items-center gap-3 border-b border-border/30 p-4">
            <SystemStateBadge status={entity.status} size="md" pulse={entity.status === 'critical'} />
            <ConfidenceIndicator level={entity.confidence} />
          </div>

          {/* Description */}
          <div className="border-b border-border/30 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{entity.description}</p>
          </div>

          {/* Metrics */}
          <div className="border-b border-border/30 p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              {entity.metrics.map(m => (
                <div key={m.label} className="rounded-md bg-muted/40 px-3 py-2">
                  <div className="font-mono text-[10px] text-muted-foreground">{m.label}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-foreground">{m.value}</span>
                    <span className={m.trend === 'up' ? 'text-status-stressed' : m.trend === 'down' ? 'text-status-critical' : 'text-muted-foreground'}>
                      {trendIcon(m.trend)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risks */}
          <div className="border-b border-border/30 p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Active Risks</h3>
            <div className="space-y-1.5">
              {entity.risks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-status-critical/5 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-status-stressed" />
                  <span className="text-xs text-foreground/80">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div className="border-b border-border/30 p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Depends On</h3>
            <div className="space-y-1">
              {deps.map(d => (
                <button
                  key={d.id}
                  onClick={() => onEntitySelect(d.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm">{entityTypeConfig[d.type].icon}</span>
                  <span className="flex-1 text-xs text-foreground">{d.name}</span>
                  <SystemStateBadge status={d.status} />
                </button>
              ))}
              {deps.length === 0 && <span className="text-xs text-muted-foreground italic">No upstream dependencies</span>}
            </div>
          </div>

          <div className="border-b border-border/30 p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Influences</h3>
            <div className="space-y-1">
              {depnts.map(d => (
                <button
                  key={d.id}
                  onClick={() => onEntitySelect(d.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm">{entityTypeConfig[d.type].icon}</span>
                  <span className="flex-1 text-xs text-foreground">{d.name}</span>
                  <SystemStateBadge status={d.status} />
                </button>
              ))}
              {depnts.length === 0 && <span className="text-xs text-muted-foreground italic">No downstream dependents</span>}
            </div>
          </div>

          {/* Relationships */}
          <div className="border-b border-border/30 p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Relationships</h3>
            <div className="space-y-1">
              {rels.map(r => {
                const other = entities.find(e => e.id === (r.source === entity.id ? r.target : r.source));
                if (!other) return null;
                const isSource = r.source === entity.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onEntitySelect(other.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <ArrowRight className={`h-3 w-3 text-primary/60 ${!isSource ? 'rotate-180' : ''}`} />
                    <span className="flex-1 font-mono text-[11px] text-foreground/70">
                      {r.type} <span className="text-foreground">{other.name}</span>
                    </span>
                    <ConfidenceIndicator level={r.confidence} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="p-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</h3>
            <div className="space-y-2">
              {entity.timeline.map((t, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-md border px-3 py-2 ${timelineTypeStyle[t.type]}`}>
                  <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="font-mono text-[10px] text-muted-foreground">{t.date}</span>
                    <p className="text-xs text-foreground/80">{t.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="border-t border-border/50 p-4">
          <button
            onClick={onTraceCausal}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 font-display text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Trace Downstream Impacts
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
