import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, TrendingDown, TrendingUp, Minus, AlertTriangle, Shield, Droplets, Wheat, Heart, Building2, TreePine, Zap } from 'lucide-react';
import type { WorldEntity, EntityStatus } from '@/data/worldModelData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
  onEntitySelect: (id: string) => void;
}

const statusOrder: EntityStatus[] = ['critical', 'stressed', 'degraded', 'uncertain', 'recovering', 'stable'];
const statusLabels: Record<EntityStatus, string> = {
  critical: 'Critical',
  stressed: 'Stressed',
  degraded: 'Degraded',
  uncertain: 'Uncertain',
  recovering: 'Recovering',
  stable: 'Stable',
};
const statusColors: Record<EntityStatus, string> = {
  critical: 'bg-status-critical',
  stressed: 'bg-status-stressed',
  degraded: 'bg-[hsl(20,70%,45%)]',
  uncertain: 'bg-status-uncertain',
  recovering: 'bg-status-recovering',
  stable: 'bg-status-stable',
};
const statusTextColors: Record<EntityStatus, string> = {
  critical: 'text-status-critical',
  stressed: 'text-status-stressed',
  degraded: 'text-[hsl(20,70%,45%)]',
  uncertain: 'text-status-uncertain',
  recovering: 'text-status-recovering',
  stable: 'text-status-stable',
};

const entityIcons: Record<string, typeof Droplets> = {
  'river-tana': Droplets,
  'dam-masinga': Building2,
  'irrigation-mwea': Wheat,
  'water-nairobi': Droplets,
  'food-nairobi': Wheat,
  'community-kibera': Shield,
  'health-nairobi': Heart,
  'hydro-kindaruma': Zap,
  'forest-upper-tana': TreePine,
  'rainfall-east': Droplets,
};

export function DashboardOverview({ isOpen, onClose, entities, onEntitySelect }: Props) {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<EntityStatus, number> = {
      stable: 0, stressed: 0, critical: 0, recovering: 0, uncertain: 0, degraded: 0,
    };
    entities.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [entities]);

  const systemHealth = useMemo(() => {
    const weights: Record<EntityStatus, number> = {
      stable: 1, recovering: 0.7, uncertain: 0.5, stressed: 0.35, degraded: 0.2, critical: 0,
    };
    const total = entities.reduce((sum, e) => sum + (weights[e.status] || 0), 0);
    return Math.round((total / entities.length) * 100);
  }, [entities]);

  const healthColor = systemHealth >= 70 ? 'text-status-stable' : systemHealth >= 40 ? 'text-status-stressed' : 'text-status-critical';

  const topRisks = useMemo(() => {
    return entities
      .filter(e => e.status === 'critical' || e.status === 'stressed' || e.status === 'degraded')
      .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
      .slice(0, 5)
      .map(e => ({
        entity: e,
        topRisk: e.risks[0] || 'Unknown risk',
        decliningMetrics: e.metrics.filter(m => m.trend === 'down').length,
      }));
  }, [entities]);

  const metricSummary = useMemo(() => {
    let declining = 0, rising = 0, stable = 0;
    entities.forEach(e => e.metrics.forEach(m => {
      if (m.trend === 'down') declining++;
      else if (m.trend === 'up') rising++;
      else stable++;
    }));
    return { declining, rising, stable, total: declining + rising + stable };
  }, [entities]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-xl border border-border/50 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">System Dashboard</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Real-time health overview · {entities.length} entities monitored
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Top row: Health score + Status distribution + Metric trends */}
              <div className="grid grid-cols-3 gap-4">
                {/* System Health Score */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">System Health</span>
                  <div className="mt-2 flex items-end gap-2">
                    <span className={`font-display text-4xl font-bold ${healthColor}`}>{systemHealth}</span>
                    <span className="mb-1 font-mono text-xs text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted/40">
                    <motion.div
                      className={`h-full rounded-full ${systemHealth >= 70 ? 'bg-status-stable' : systemHealth >= 40 ? 'bg-status-stressed' : 'bg-status-critical'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${systemHealth}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                    {systemHealth >= 70 ? 'Systems operating within acceptable parameters' :
                     systemHealth >= 40 ? 'Multiple systems under stress — monitor closely' :
                     'Critical conditions detected — immediate attention required'}
                  </p>
                </div>

                {/* Status Distribution */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Status Distribution</span>
                  <div className="mt-3 space-y-1.5">
                    {statusOrder.filter(s => statusCounts[s] > 0).map(status => (
                      <div key={status} className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                        <span className="flex-1 font-mono text-[10px] text-foreground/70">{statusLabels[status]}</span>
                        <span className={`font-mono text-xs font-medium ${statusTextColors[status]}`}>{statusCounts[status]}</span>
                        <div className="h-1.5 w-16 rounded-full bg-muted/40">
                          <div
                            className={`h-full rounded-full ${statusColors[status]}`}
                            style={{ width: `${(statusCounts[status] / entities.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metric Trends */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Metric Trends</span>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-critical/10">
                        <TrendingDown className="h-4 w-4 text-status-critical" />
                      </div>
                      <div>
                        <span className="font-display text-lg font-bold text-status-critical">{metricSummary.declining}</span>
                        <span className="ml-1 font-mono text-[9px] text-muted-foreground">declining</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-stressed/10">
                        <TrendingUp className="h-4 w-4 text-status-stressed" />
                      </div>
                      <div>
                        <span className="font-display text-lg font-bold text-status-stressed">{metricSummary.rising}</span>
                        <span className="ml-1 font-mono text-[9px] text-muted-foreground">rising</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30">
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-display text-lg font-bold text-muted-foreground">{metricSummary.stable}</span>
                        <span className="ml-1 font-mono text-[9px] text-muted-foreground">stable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk alerts */}
              <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-status-critical" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-status-critical">Priority Alerts</span>
                </div>
                <div className="mt-3 space-y-2">
                  {topRisks.map(({ entity, topRisk, decliningMetrics }) => {
                    const Icon = entityIcons[entity.id] || Activity;
                    return (
                      <motion.div
                        key={entity.id}
                        onHoverStart={() => setHoveredEntity(entity.id)}
                        onHoverEnd={() => setHoveredEntity(null)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                          hoveredEntity === entity.id ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-muted/10'
                        }`}
                        onClick={() => { onEntitySelect(entity.id); onClose(); }}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          entity.status === 'critical' ? 'bg-status-critical/15' : 'bg-status-stressed/15'
                        }`}>
                          <Icon className={`h-4 w-4 ${statusTextColors[entity.status]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-foreground">{entity.name}</span>
                            <span className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase ${statusColors[entity.status]} text-white`}>
                              {entity.status}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">{topRisk}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[9px] text-muted-foreground">
                            {decliningMetrics} metric{decliningMetrics !== 1 ? 's' : ''} declining
                          </div>
                          <div className="font-mono text-[8px] text-muted-foreground/60">
                            Confidence: {entity.confidence}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Entity grid - compact cards */}
              <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">All Entities</span>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {entities.map(entity => {
                    const Icon = entityIcons[entity.id] || Activity;
                    return (
                      <button
                        key={entity.id}
                        onClick={() => { onEntitySelect(entity.id); onClose(); }}
                        className="group rounded-lg border border-border/30 bg-muted/10 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`h-3.5 w-3.5 ${statusTextColors[entity.status]}`} />
                          <div className={`h-2 w-2 rounded-full ${statusColors[entity.status]}`} />
                        </div>
                        <div className="mt-2 truncate font-mono text-[9px] font-medium text-foreground group-hover:text-primary">
                          {entity.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {entity.metrics.slice(0, 2).map((m, i) => (
                            <span key={i} className="truncate font-mono text-[7px] text-muted-foreground">
                              {m.label}: {m.value}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
