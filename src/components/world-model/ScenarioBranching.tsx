import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Plus, Trash2, Play, ArrowRight, Copy } from 'lucide-react';
import { SystemStateBadge, ConfidenceIndicator } from './SystemStateBadge';
import type { WorldEntity, EntityStatus, ConfidenceLevel } from '@/data/worldModelData';
import { entities as baseEntities } from '@/data/worldModelData';

interface BranchModification {
  entityId: string;
  field: string;
  originalValue: string;
  newValue: string;
  newStatus?: EntityStatus;
}

interface TimelineBranch {
  id: string;
  name: string;
  forkPoint: string; // date string
  color: string;
  modifications: BranchModification[];
  description: string;
}

const branchColors = [
  'hsl(var(--primary))',
  'hsl(35, 90%, 55%)',
  'hsl(270, 60%, 60%)',
  'hsl(0, 72%, 55%)',
];

const presetBranches: TimelineBranch[] = [
  {
    id: 'branch-drought-severe',
    name: 'Severe Drought',
    forkPoint: 'Jun 2025',
    color: branchColors[3],
    description: 'What if the drought intensifies to a 50-year extreme?',
    modifications: [
      { entityId: 'rainfall-east', field: 'Annual Rainfall', originalValue: '780mm', newValue: '520mm', newStatus: 'critical' },
      { entityId: 'river-tana', field: 'Flow Rate', originalValue: '340 m³/s', newValue: '180 m³/s', newStatus: 'critical' },
      { entityId: 'dam-masinga', field: 'Reservoir Level', originalValue: '78%', newValue: '45%', newStatus: 'stressed' },
      { entityId: 'irrigation-mwea', field: 'Water Allocation', originalValue: '68%', newValue: '25%', newStatus: 'critical' },
      { entityId: 'community-kibera', field: 'Food Security Index', originalValue: '0.38', newValue: '0.19', newStatus: 'critical' },
    ],
  },
  {
    id: 'branch-reforestation',
    name: 'Rapid Reforestation',
    forkPoint: 'Mar 2025',
    color: branchColors[0],
    description: 'Aggressive 10,000ha reforestation with full community engagement',
    modifications: [
      { entityId: 'forest-upper-tana', field: 'Forest Cover', originalValue: '62%', newValue: '71%', newStatus: 'recovering' },
      { entityId: 'forest-upper-tana', field: 'Deforestation Rate', originalValue: '1.8%/yr', newValue: '0.3%/yr', newStatus: 'recovering' },
      { entityId: 'river-tana', field: 'Sediment Load', originalValue: '12.4 mg/L', newValue: '7.8 mg/L', newStatus: 'recovering' },
      { entityId: 'river-tana', field: 'Flow Rate', originalValue: '340 m³/s', newValue: '410 m³/s', newStatus: 'recovering' },
      { entityId: 'dam-masinga', field: 'Siltation Rate', originalValue: '2.1M m³/yr', newValue: '1.2M m³/yr', newStatus: 'stable' },
    ],
  },
  {
    id: 'branch-infra-invest',
    name: 'Infrastructure Surge',
    forkPoint: 'Sep 2025',
    color: branchColors[2],
    description: 'Major infrastructure investment: tunnels, pipes, and smart metering',
    modifications: [
      { entityId: 'water-nairobi', field: 'Daily Deficit', originalValue: '200K m³', newValue: '60K m³', newStatus: 'recovering' },
      { entityId: 'water-nairobi', field: 'Pipe Leakage', originalValue: '38%', newValue: '18%', newStatus: 'recovering' },
      { entityId: 'community-kibera', field: 'Water Access', originalValue: '45%', newValue: '72%', newStatus: 'stressed' },
      { entityId: 'health-nairobi', field: 'Waterborne Cases', originalValue: '+34%', newValue: '-12%', newStatus: 'recovering' },
      { entityId: 'health-nairobi', field: 'Bed Occupancy', originalValue: '92%', newValue: '78%', newStatus: 'stable' },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
  onEntitySelect: (id: string) => void;
}

export function ScenarioBranching({ isOpen, onClose, entities, onEntitySelect }: Props) {
  const [activeBranches, setActiveBranches] = useState<string[]>(['branch-drought-severe', 'branch-reforestation']);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  const toggleBranch = useCallback((id: string) => {
    setActiveBranches(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }, []);

  const selectedBranches = presetBranches.filter(b => activeBranches.includes(b.id));

  const entityMap = useMemo(() =>
    Object.fromEntries(entities.map(e => [e.id, e])),
    [entities]
  );

  // Compute divergence summary between selected branches
  const divergenceEntities = useMemo(() => {
    const allEntityIds = new Set<string>();
    selectedBranches.forEach(b => b.modifications.forEach(m => allEntityIds.add(m.entityId)));
    return Array.from(allEntityIds);
  }, [selectedBranches]);

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
            className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-border/50 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <GitBranch className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">Scenario Branching</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Fork the timeline · Compare divergent futures
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Branch selector */}
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Branches:</span>
              {presetBranches.map(b => (
                <button
                  key={b.id}
                  onClick={() => toggleBranch(b.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                    activeBranches.includes(b.id)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.name}
                </button>
              ))}
            </div>

            {/* Comparison content */}
            <div className="flex-1 overflow-auto p-4">
              {selectedBranches.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <span className="font-mono text-xs">Select branches above to compare</span>
                </div>
              ) : (
                <>
                  {/* Branch cards side by side */}
                  <div className={`grid gap-4 ${selectedBranches.length === 1 ? 'grid-cols-1' : selectedBranches.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {selectedBranches.map(branch => (
                      <div key={branch.id} className="flex flex-col rounded-lg border border-border/40 bg-muted/10">
                        {/* Branch header */}
                        <div className="border-b border-border/30 p-4">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: branch.color }} />
                            <h3 className="font-display text-sm font-semibold text-foreground">{branch.name}</h3>
                          </div>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{branch.description}</p>
                          <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1">
                            <GitBranch className="h-3 w-3 text-primary" />
                            <span className="font-mono text-[9px] text-muted-foreground">Forked at</span>
                            <span className="font-mono text-[10px] font-medium text-primary">{branch.forkPoint}</span>
                          </div>
                        </div>

                        {/* Modifications */}
                        <div className="flex-1 p-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Projected Changes</span>
                          <div className="mt-2 space-y-2">
                            {branch.modifications.map((mod, i) => {
                              const entity = entityMap[mod.entityId];
                              return (
                                <div key={i} className="rounded-md bg-muted/20 px-3 py-2">
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => onEntitySelect(mod.entityId)}
                                      className="font-mono text-[9px] text-foreground/70 transition-colors hover:text-primary"
                                    >
                                      {entity?.name || mod.entityId} · {mod.field}
                                    </button>
                                    {mod.newStatus && <SystemStateBadge status={mod.newStatus} />}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted-foreground line-through">{mod.originalValue}</span>
                                    <ArrowRight className="h-3 w-3 text-primary/50" />
                                    <span className="font-mono text-xs font-medium text-foreground">{mod.newValue}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* System state summary */}
                        <div className="border-t border-border/30 p-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Affected Entities</span>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {[...new Set(branch.modifications.map(m => m.entityId))].map(eid => {
                              const entity = entityMap[eid];
                              const mod = branch.modifications.find(m => m.entityId === eid && m.newStatus);
                              return (
                                <button
                                  key={eid}
                                  onClick={() => onEntitySelect(eid)}
                                  className="flex items-center gap-1 rounded-full border border-border/40 bg-muted/20 px-2 py-0.5 transition-colors hover:border-primary/40"
                                >
                                  <span className="font-mono text-[9px] text-foreground/70">{entity?.name || eid}</span>
                                  {mod?.newStatus && (
                                    <>
                                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                      <SystemStateBadge status={mod.newStatus} />
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divergence matrix */}
                  {selectedBranches.length > 1 && (
                    <div className="mt-4 rounded-lg border border-border/40 bg-muted/10 p-4">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Divergence Matrix</span>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Entities affected differently across branches
                      </p>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/30">
                              <th className="pb-2 text-left font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Entity</th>
                              <th className="pb-2 text-left font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Current</th>
                              {selectedBranches.map(b => (
                                <th key={b.id} className="pb-2 text-left font-mono text-[9px] uppercase tracking-wider" style={{ color: b.color }}>
                                  {b.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {divergenceEntities.map(eid => {
                              const entity = entityMap[eid];
                              if (!entity) return null;
                              return (
                                <tr key={eid} className="border-b border-border/20">
                                  <td className="py-2">
                                    <button
                                      onClick={() => onEntitySelect(eid)}
                                      className="font-mono text-[10px] text-foreground/70 transition-colors hover:text-primary"
                                    >
                                      {entity.name}
                                    </button>
                                  </td>
                                  <td className="py-2">
                                    <SystemStateBadge status={entity.status} />
                                  </td>
                                  {selectedBranches.map(b => {
                                    const mod = b.modifications.find(m => m.entityId === eid && m.newStatus);
                                    return (
                                      <td key={b.id} className="py-2">
                                        {mod?.newStatus ? (
                                          <SystemStateBadge status={mod.newStatus} />
                                        ) : (
                                          <span className="font-mono text-[9px] text-muted-foreground/50">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
