import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Flag, Pin, Trash2, X, StickyNote } from 'lucide-react';

export interface Annotation {
  id: string;
  entityId: string;
  type: 'note' | 'flag' | 'observation';
  text: string;
  author: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
  color: string;
}

const priorityColors: Record<string, string> = {
  low: 'hsl(var(--muted))',
  medium: 'hsl(var(--primary))',
  high: 'hsl(var(--destructive))',
};

const typeIcons = {
  note: StickyNote,
  flag: Flag,
  observation: Pin,
};

const typeLabels = {
  note: 'Note',
  flag: 'Flag',
  observation: 'Observation',
};

interface Props {
  entityId: string | null;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function AnnotationPanel({ entityId, entityName, isOpen, onClose, annotations, onAddAnnotation, onDeleteAnnotation }: Props) {
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'note' | 'flag' | 'observation'>('note');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const entityAnnotations = annotations.filter(a => a.entityId === entityId);

  const handleAdd = useCallback(() => {
    if (!newText.trim() || !entityId) return;
    onAddAnnotation({
      entityId,
      type: newType,
      text: newText.trim(),
      author: 'Analyst',
      priority: newPriority,
      color: priorityColors[newPriority],
    });
    setNewText('');
  }, [entityId, newText, newType, newPriority, onAddAnnotation]);

  if (!isOpen || !entityId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-20 right-4 z-40 w-80 rounded-xl border border-border/50 bg-card/95 shadow-2xl backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
            <div>
              <span className="text-xs font-semibold text-foreground">Annotations</span>
              <span className="ml-2 font-mono text-[9px] text-muted-foreground">{entityName}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Existing annotations */}
        <div className="max-h-52 overflow-y-auto p-3">
          {entityAnnotations.length === 0 ? (
            <p className="py-4 text-center font-mono text-[10px] text-muted-foreground">
              No annotations yet. Add one below.
            </p>
          ) : (
            <div className="space-y-2">
              {entityAnnotations.map(ann => {
                const Icon = typeIcons[ann.type];
                return (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group flex gap-2 rounded-lg border border-border/20 bg-muted/20 p-2.5"
                  >
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{ backgroundColor: `${ann.color}20` }}
                    >
                      <Icon className="h-3 w-3" style={{ color: ann.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          {typeLabels[ann.type]}
                        </span>
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: priorityColors[ann.priority] }}
                        />
                        <span className="font-mono text-[8px] text-muted-foreground/60">
                          {ann.author} · {new Date(ann.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-foreground/90">{ann.text}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAnnotation(ann.id)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new annotation */}
        <div className="border-t border-border/30 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            {(['note', 'flag', 'observation'] as const).map(type => {
              const Icon = typeIcons[type];
              return (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                    newType === type
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {typeLabels[type]}
                </button>
              );
            })}
            <div className="flex-1" />
            {(['low', 'medium', 'high'] as const).map(p => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  newPriority === p ? 'scale-110 border-foreground/50' : 'border-transparent'
                }`}
                style={{ backgroundColor: priorityColors[p] }}
                title={p}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add annotation..."
              className="flex-1 rounded-lg border border-border/30 bg-muted/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="rounded-lg bg-primary/15 px-3 py-1.5 font-mono text-[10px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Badge to show annotation count on entities
export function AnnotationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
      {count}
    </div>
  );
}
