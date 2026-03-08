import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Link2, ArrowRight, Save } from 'lucide-react';
import type { WorldEntity, WorldRelationship, ConfidenceLevel } from '@/data/worldModelData';
import { relationships as baseRelationships } from '@/data/worldModelData';
import { ConfidenceIndicator } from './SystemStateBadge';

const relationshipTypes = [
  'supplies water to',
  'regulates flow of',
  'feeds into',
  'allocates water to',
  'supplies food to',
  'feeds',
  'supports',
  'serves',
  'sustains',
  'replenishes',
  'depends on',
  'influences',
  'constrains',
  'amplifies',
];

interface CustomRelationship extends WorldRelationship {
  isCustom?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
}

export function RelationshipEditor({ isOpen, onClose, entities, selectedEntityId, onEntitySelect }: Props) {
  const [customRelationships, setCustomRelationships] = useState<CustomRelationship[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newType, setNewType] = useState(relationshipTypes[0]);
  const [newStrength, setNewStrength] = useState(0.5);
  const [newConfidence, setNewConfidence] = useState<ConfidenceLevel>('medium');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const allRelationships: CustomRelationship[] = useMemo(() => {
    const base = baseRelationships.map(r => ({ ...r, isCustom: false }));
    return [...base, ...customRelationships];
  }, [customRelationships]);

  const entityMap = useMemo(() =>
    Object.fromEntries(entities.map(e => [e.id, e])),
    [entities]
  );

  const filteredRelationships = useMemo(() => {
    if (filterEntity === 'all') return allRelationships;
    return allRelationships.filter(r => r.source === filterEntity || r.target === filterEntity);
  }, [allRelationships, filterEntity]);

  const handleAdd = useCallback(() => {
    if (!newSource || !newTarget || newSource === newTarget) return;
    const id = `custom-r-${Date.now()}`;
    setCustomRelationships(prev => [...prev, {
      id,
      source: newSource,
      target: newTarget,
      type: newType,
      strength: newStrength,
      confidence: newConfidence,
      isCustom: true,
    }]);
    setShowAddForm(false);
    setNewSource('');
    setNewTarget('');
    setNewStrength(0.5);
  }, [newSource, newTarget, newType, newStrength, newConfidence]);

  const handleDelete = useCallback((id: string) => {
    setCustomRelationships(prev => prev.filter(r => r.id !== id));
  }, []);

  const strengthColor = (s: number) => {
    if (s >= 0.8) return 'text-status-stable';
    if (s >= 0.5) return 'text-status-stressed';
    return 'text-muted-foreground';
  };

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
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border/50 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">Relationship Editor</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {allRelationships.length} relationships · {customRelationships.length} custom
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                >
                  <Plus className="h-3 w-3" />
                  New Link
                </button>
                <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-border/30"
                >
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Source Entity</label>
                        <select
                          value={newSource}
                          onChange={e => setNewSource(e.target.value)}
                          className="w-full rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 font-mono text-xs text-foreground"
                        >
                          <option value="">Select source...</option>
                          {entities.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Target Entity</label>
                        <select
                          value={newTarget}
                          onChange={e => setNewTarget(e.target.value)}
                          className="w-full rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 font-mono text-xs text-foreground"
                        >
                          <option value="">Select target...</option>
                          {entities.filter(e => e.id !== newSource).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Relationship Type</label>
                        <select
                          value={newType}
                          onChange={e => setNewType(e.target.value)}
                          className="w-full rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 font-mono text-xs text-foreground"
                        >
                          {relationshipTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Strength: {Math.round(newStrength * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={newStrength}
                            onChange={e => setNewStrength(parseFloat(e.target.value))}
                            className="w-full accent-[hsl(var(--primary))]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Confidence</label>
                          <select
                            value={newConfidence}
                            onChange={e => setNewConfidence(e.target.value as ConfidenceLevel)}
                            className="w-full rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 font-mono text-xs text-foreground"
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="rounded-md border border-border/50 px-3 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAdd}
                        disabled={!newSource || !newTarget || newSource === newTarget}
                        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-[10px] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                      >
                        <Save className="h-3 w-3" />
                        Add Relationship
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter */}
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Filter:</span>
              <select
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 font-mono text-[10px] text-foreground"
              >
                <option value="all">All entities</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <span className="font-mono text-[9px] text-muted-foreground">
                {filteredRelationships.length} links
              </span>
            </div>

            {/* Relationship list */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-1.5">
                {filteredRelationships.map(rel => {
                  const source = entityMap[rel.source];
                  const target = entityMap[rel.target];
                  return (
                    <motion.div
                      key={rel.id}
                      layout
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                        rel.isCustom ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-muted/10'
                      }`}
                    >
                      {/* Source */}
                      <button
                        onClick={() => source && onEntitySelect(source.id)}
                        className="min-w-0 shrink-0 font-mono text-[10px] font-medium text-foreground/80 transition-colors hover:text-primary"
                      >
                        {source?.name || rel.source}
                      </button>

                      {/* Relationship */}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className="h-px flex-1 bg-border/40" />
                        <span className="shrink-0 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                          {rel.type}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      </div>

                      {/* Target */}
                      <button
                        onClick={() => target && onEntitySelect(target.id)}
                        className="min-w-0 shrink-0 font-mono text-[10px] font-medium text-foreground/80 transition-colors hover:text-primary"
                      >
                        {target?.name || rel.target}
                      </button>

                      {/* Metadata */}
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[9px] ${strengthColor(rel.strength)}`}>
                          {Math.round(rel.strength * 100)}%
                        </span>
                        <ConfidenceIndicator level={rel.confidence} />
                        {rel.isCustom && (
                          <button
                            onClick={() => handleDelete(rel.id)}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
