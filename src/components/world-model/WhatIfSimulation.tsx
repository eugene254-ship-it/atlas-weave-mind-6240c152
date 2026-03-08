import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, X, RotateCcw, Play, ChevronRight } from 'lucide-react';
import { type WorldEntity, type EntityStatus, relationships, entityTypeConfig } from '@/data/worldModelData';

const statusOrder: EntityStatus[] = ['stable', 'recovering', 'uncertain', 'stressed', 'degraded', 'critical'];

const statusColors: Record<EntityStatus, string> = {
  stable: 'hsl(155, 65%, 45%)',
  stressed: 'hsl(35, 90%, 55%)',
  critical: 'hsl(0, 72%, 55%)',
  recovering: 'hsl(200, 70%, 55%)',
  uncertain: 'hsl(270, 40%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
};

interface CascadeEffect {
  entityId: string;
  entityName: string;
  originalStatus: EntityStatus;
  newStatus: EntityStatus;
  depth: number;
  reason: string;
}

// Simple cascade propagation model
function propagateCascade(
  sourceId: string,
  newStatus: EntityStatus,
  entities: WorldEntity[],
  overrides: Record<string, EntityStatus>
): CascadeEffect[] {
  const effects: CascadeEffect[] = [];
  const visited = new Set<string>([sourceId]);
  const entityMap = new Map(entities.map(e => [e.id, e]));

  // Get severity index
  const severity = (s: EntityStatus) => statusOrder.indexOf(s);
  const sourceSeverity = severity(newStatus);

  // BFS through dependents
  let queue: { id: string; depth: number }[] = [];
  const source = entityMap.get(sourceId);
  if (!source) return effects;

  for (const depId of source.dependents) {
    if (!visited.has(depId)) queue.push({ id: depId, depth: 1 });
  }

  while (queue.length > 0) {
    const next: { id: string; depth: number }[] = [];
    for (const { id, depth } of queue) {
      if (visited.has(id)) continue;
      visited.add(id);

      const entity = entityMap.get(id);
      if (!entity) continue;

      const currentStatus = overrides[id] || entity.status;
      const currentSev = severity(currentStatus);

      // Cascade: if source is worse and connected, degrade dependents
      // Effect diminishes with depth
      const impactThreshold = Math.max(0, sourceSeverity - depth);
      if (impactThreshold > currentSev) {
        const newEntityStatus = statusOrder[Math.min(impactThreshold, statusOrder.length - 1)];
        
        // Find the relationship that connects
        const rel = relationships.find(
          r => (r.source === sourceId && r.target === id) || 
               entities.some(e => e.id === r.source && visited.has(r.source) && r.target === id)
        );
        
        effects.push({
          entityId: id,
          entityName: entity.name,
          originalStatus: entity.status,
          newStatus: newEntityStatus,
          depth,
          reason: rel ? `via ${rel.type}` : 'dependency chain',
        });

        // Continue cascade
        for (const depId of entity.dependents) {
          if (!visited.has(depId)) next.push({ id: depId, depth: depth + 1 });
        }
      }
    }
    queue = next;
  }

  return effects;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
}

export function WhatIfSimulation({ isOpen, onClose, entities }: Props) {
  const [overrides, setOverrides] = useState<Record<string, EntityStatus>>({});
  const [cascadeResults, setCascadeResults] = useState<CascadeEffect[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleStatusChange = useCallback((entityId: string, status: EntityStatus) => {
    setOverrides(prev => ({ ...prev, [entityId]: status }));
    setHasRun(false);
    setCascadeResults([]);
  }, []);

  const runSimulation = useCallback(() => {
    const allEffects: CascadeEffect[] = [];
    for (const [entityId, newStatus] of Object.entries(overrides)) {
      const entity = entities.find(e => e.id === entityId);
      if (!entity || entity.status === newStatus) continue;
      const effects = propagateCascade(entityId, newStatus, entities, overrides);
      allEffects.push(...effects);
    }
    // Deduplicate by entityId, keep worst
    const effectMap = new Map<string, CascadeEffect>();
    for (const e of allEffects) {
      const existing = effectMap.get(e.entityId);
      if (!existing || statusOrder.indexOf(e.newStatus) > statusOrder.indexOf(existing.newStatus)) {
        effectMap.set(e.entityId, e);
      }
    }
    setCascadeResults(Array.from(effectMap.values()).sort((a, b) => a.depth - b.depth));
    setHasRun(true);
  }, [overrides, entities]);

  const reset = useCallback(() => {
    setOverrides({});
    setCascadeResults([]);
    setHasRun(false);
  }, []);

  const modifiedCount = Object.entries(overrides).filter(
    ([id, status]) => entities.find(e => e.id === id)?.status !== status
  ).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20">
                <Wand2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">What-If Simulation</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Set entity statuses manually · Run to see cascading effects
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded-lg border border-border/30 px-3 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
              <button
                onClick={runSimulation}
                disabled={modifiedCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 font-mono text-[10px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-40"
              >
                <Play className="h-3 w-3" />
                Propagate ({modifiedCount} change{modifiedCount !== 1 ? 's' : ''})
              </button>
              <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Entity status controls */}
            <div className="w-1/2 overflow-y-auto border-r border-border/20 p-4">
              <h4 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Set Intervention Statuses
              </h4>
              <div className="space-y-2">
                {entities.map(entity => {
                  const currentOverride = overrides[entity.id];
                  const isModified = currentOverride && currentOverride !== entity.status;
                  return (
                    <div
                      key={entity.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        isModified ? 'border-primary/30 bg-primary/5' : 'border-border/20 bg-muted/10'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm">{entityTypeConfig[entity.type].icon}</span>
                        <span className="text-xs font-medium text-foreground">{entity.name}</span>
                        {isModified && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[8px] text-primary">
                            MODIFIED
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {statusOrder.map(status => {
                          const isOriginal = entity.status === status;
                          const isSelected = (currentOverride || entity.status) === status;
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(entity.id, status)}
                              className={`rounded-md px-2 py-1 font-mono text-[9px] transition-all ${
                                isSelected
                                  ? 'ring-1 ring-foreground/30 font-semibold'
                                  : 'opacity-50 hover:opacity-80'
                              }`}
                              style={{
                                backgroundColor: isSelected ? `${statusColors[status]}30` : `${statusColors[status]}10`,
                                color: statusColors[status],
                              }}
                            >
                              {status}
                              {isOriginal && ' ●'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cascade results */}
            <div className="w-1/2 overflow-y-auto p-4">
              <h4 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Cascading Effects
              </h4>
              {!hasRun ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wand2 className="mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Modify entity statuses on the left, then click Propagate to see downstream effects.
                  </p>
                </div>
              ) : cascadeResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    No cascading effects detected from the current changes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cascadeResults.map((effect, i) => (
                    <motion.div
                      key={effect.entityId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-lg border border-border/20 bg-muted/10 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: effect.depth }, (_, j) => (
                            <ChevronRight key={j} className="h-2.5 w-2.5 text-muted-foreground/40" />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">{effect.entityName}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[9px]"
                          style={{ backgroundColor: `${statusColors[effect.originalStatus]}20`, color: statusColors[effect.originalStatus] }}
                        >
                          {effect.originalStatus}
                        </span>
                        <span className="text-[10px] text-muted-foreground">→</span>
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                          style={{ backgroundColor: `${statusColors[effect.newStatus]}20`, color: statusColors[effect.newStatus] }}
                        >
                          {effect.newStatus}
                        </span>
                        <span className="font-mono text-[8px] text-muted-foreground">{effect.reason}</span>
                      </div>
                    </motion.div>
                  ))}

                  {/* Summary */}
                  <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <h5 className="mb-1 font-mono text-[9px] uppercase tracking-wider text-destructive">Impact Summary</h5>
                    <p className="text-xs text-foreground/80">
                      {cascadeResults.length} entit{cascadeResults.length === 1 ? 'y' : 'ies'} affected across{' '}
                      {Math.max(...cascadeResults.map(e => e.depth))} depth level{Math.max(...cascadeResults.map(e => e.depth)) > 1 ? 's' : ''}.
                      {cascadeResults.filter(e => e.newStatus === 'critical').length > 0 && (
                        <span className="font-semibold text-destructive">
                          {' '}{cascadeResults.filter(e => e.newStatus === 'critical').length} reaching critical status.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
