import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { type WorldEntity, type EntityStatus, entityTypeConfig } from '@/data/worldModelData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
  onEntitySelect: (id: string) => void;
}

const statusSeverity: Record<EntityStatus, number> = {
  stable: 0,
  recovering: 1,
  uncertain: 2,
  stressed: 3,
  degraded: 4,
  critical: 5,
};

function computeRiskScore(entity: WorldEntity): number {
  const statusScore = statusSeverity[entity.status] * 20; // 0-100
  const riskCount = Math.min(entity.risks.length, 5) * 8; // 0-40
  const confidencePenalty = entity.confidence === 'low' ? 15 : entity.confidence === 'medium' ? 8 : 0;
  const downTrends = entity.metrics.filter(m => m.trend === 'down').length;
  const trendPenalty = downTrends * 6; // 0-24
  const dependentExposure = Math.min(entity.dependents.length, 5) * 4; // 0-20

  return Math.min(100, statusScore + riskCount + confidencePenalty + trendPenalty + dependentExposure);
}

function getRiskColor(score: number): string {
  if (score >= 80) return 'hsl(var(--status-critical))';
  if (score >= 60) return 'hsl(var(--status-stressed))';
  if (score >= 40) return 'hsl(var(--status-uncertain))';
  if (score >= 20) return 'hsl(var(--status-recovering))';
  return 'hsl(var(--status-stable))';
}

function getRiskBg(score: number): string {
  if (score >= 80) return 'bg-status-critical/20 border-status-critical/40';
  if (score >= 60) return 'bg-status-stressed/20 border-status-stressed/40';
  if (score >= 40) return 'bg-status-uncertain/20 border-status-uncertain/40';
  if (score >= 20) return 'bg-status-recovering/20 border-status-recovering/40';
  return 'bg-status-stable/20 border-status-stable/40';
}

function getRiskLabel(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  if (score >= 20) return 'LOW';
  return 'MINIMAL';
}

export function RiskHeatmap({ isOpen, onClose, entities, onEntitySelect }: Props) {
  if (!isOpen) return null;

  const scored = entities
    .map(e => ({ entity: e, score: computeRiskScore(e) }))
    .sort((a, b) => b.score - a.score);

  const avgScore = Math.round(scored.reduce((s, e) => s + e.score, 0) / scored.length);
  const criticalCount = scored.filter(s => s.score >= 80).length;
  const highCount = scored.filter(s => s.score >= 60 && s.score < 80).length;

  // Treemap layout: proportional sizing
  const totalScore = scored.reduce((s, e) => s + Math.max(e.score, 10), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-[900px] max-h-[80vh] overflow-auto rounded-2xl border border-border/50 bg-card p-6"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-critical/10">
                <Flame className="h-5 w-5 text-status-critical" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Risk Heatmap</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Compound risk scores across all entities
                </span>
              </div>
            </div>

            {/* Summary badges */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-center">
                <div className="font-mono text-lg font-bold" style={{ color: getRiskColor(avgScore) }}>{avgScore}</div>
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Avg Score</div>
              </div>
              {criticalCount > 0 && (
                <div className="rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-1.5 text-center">
                  <div className="font-mono text-lg font-bold text-status-critical">{criticalCount}</div>
                  <div className="font-mono text-[8px] uppercase tracking-wider text-status-critical/70">Critical</div>
                </div>
              )}
              {highCount > 0 && (
                <div className="rounded-lg border border-status-stressed/30 bg-status-stressed/10 px-3 py-1.5 text-center">
                  <div className="font-mono text-lg font-bold text-status-stressed">{highCount}</div>
                  <div className="font-mono text-[8px] uppercase tracking-wider text-status-stressed/70">High</div>
                </div>
              )}
              <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Treemap Grid */}
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {scored.map(({ entity, score }, i) => {
              const proportion = Math.max(entity.risks.length, 1);
              return (
                <motion.button
                  key={entity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { onEntitySelect(entity.id); onClose(); }}
                  className={`relative rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${getRiskBg(score)}`}
                  style={{ gridRow: proportion >= 3 ? 'span 2' : undefined }}
                >
                  {/* Score bar */}
                  <div className="absolute left-0 top-0 h-full rounded-l-xl opacity-10" style={{
                    width: `${score}%`,
                    backgroundColor: getRiskColor(score),
                  }} />

                  <div className="relative">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm">{entityTypeConfig[entity.type].icon}</span>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
                        style={{ color: getRiskColor(score), backgroundColor: `${getRiskColor(score)}20` }}
                      >
                        {score}
                      </span>
                    </div>

                    <h3 className="mb-1 font-display text-sm font-semibold text-foreground">{entity.name}</h3>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {getRiskLabel(score)} · {entity.status}
                    </span>

                    {/* Risk factors */}
                    <div className="mt-3 space-y-1">
                      {entity.risks.slice(0, 2).map((risk, ri) => (
                        <div key={ri} className="flex items-start gap-1.5">
                          <div className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50" />
                          <span className="font-mono text-[8px] leading-tight text-muted-foreground">{risk}</span>
                        </div>
                      ))}
                    </div>

                    {/* Trend indicators */}
                    <div className="mt-2 flex items-center gap-2">
                      {entity.metrics.filter(m => m.trend === 'down').length > 0 && (
                        <span className="flex items-center gap-0.5 font-mono text-[8px] text-status-critical">
                          <TrendingDown className="h-2.5 w-2.5" />
                          {entity.metrics.filter(m => m.trend === 'down').length} declining
                        </span>
                      )}
                      {entity.metrics.filter(m => m.trend === 'up').length > 0 && (
                        <span className="flex items-center gap-0.5 font-mono text-[8px] text-status-stressed">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {entity.metrics.filter(m => m.trend === 'up').length} rising
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 rounded-lg border border-border/30 bg-muted/20 px-4 py-2">
            {[
              { label: 'Minimal', min: 0 },
              { label: 'Low', min: 20 },
              { label: 'Moderate', min: 40 },
              { label: 'High', min: 60 },
              { label: 'Critical', min: 80 },
            ].map(({ label, min }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getRiskColor(min) }} />
                <span className="font-mono text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
