import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { entities, relationships, causalChains, entityTypeConfig } from '@/data/worldModelData';
import { SystemStateBadge } from './SystemStateBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onEntitySelect: (id: string) => void;
  onShowCausalTrace: (chainId: string) => void;
}

interface SearchResult {
  type: 'entity' | 'relationship' | 'risk' | 'event' | 'causal';
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  status?: string;
  action: () => void;
}

export function CrossSystemSearch({ onEntitySelect, onShowCausalTrace }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    // Search entities
    entities.forEach(e => {
      if (e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.type.includes(q) || e.status.includes(q)) {
        out.push({
          type: 'entity',
          id: e.id,
          title: e.name,
          subtitle: `${entityTypeConfig[e.type].label} · ${e.status} · ${e.location || 'Global'}`,
          icon: entityTypeConfig[e.type].icon,
          status: e.status,
          action: () => { onEntitySelect(e.id); setIsOpen(false); setQuery(''); },
        });
      }
    });

    // Search relationships
    relationships.forEach(r => {
      if (r.type.toLowerCase().includes(q)) {
        const src = entities.find(e => e.id === r.source);
        const tgt = entities.find(e => e.id === r.target);
        if (src && tgt) {
          out.push({
            type: 'relationship',
            id: r.id,
            title: `${src.name} → ${tgt.name}`,
            subtitle: `${r.type} · Strength: ${Math.round(r.strength * 100)}% · ${r.confidence} confidence`,
            icon: '🔗',
            action: () => { onEntitySelect(r.source); setIsOpen(false); setQuery(''); },
          });
        }
      }
    });

    // Search risks
    entities.forEach(e => {
      e.risks.forEach(risk => {
        if (risk.toLowerCase().includes(q)) {
          out.push({
            type: 'risk',
            id: `${e.id}-risk-${risk.slice(0, 10)}`,
            title: risk,
            subtitle: `Risk on ${e.name}`,
            icon: '⚠️',
            status: e.status,
            action: () => { onEntitySelect(e.id); setIsOpen(false); setQuery(''); },
          });
        }
      });
    });

    // Search timeline events
    entities.forEach(e => {
      e.timeline.forEach(t => {
        if (t.event.toLowerCase().includes(q)) {
          out.push({
            type: 'event',
            id: `${e.id}-evt-${t.date}`,
            title: t.event,
            subtitle: `${t.date} · ${e.name}`,
            icon: '📅',
            action: () => { onEntitySelect(e.id); setIsOpen(false); setQuery(''); },
          });
        }
      });
    });

    // Search causal chains
    Object.entries(causalChains).forEach(([chainId, steps]) => {
      steps.forEach(step => {
        if (step.label.toLowerCase().includes(q) || step.detail.toLowerCase().includes(q)) {
          out.push({
            type: 'causal',
            id: `${chainId}-${step.id}`,
            title: step.label,
            subtitle: `Causal chain: ${chainId.replace('-', ' ')} · ${step.confidence} confidence`,
            icon: '🔄',
            status: step.status,
            action: () => { onShowCausalTrace(chainId); setIsOpen(false); setQuery(''); },
          });
        }
      });
    });

    return out.slice(0, 20);
  }, [query, onEntitySelect, onShowCausalTrace]);

  const typeLabels: Record<string, string> = {
    entity: 'Entities',
    relationship: 'Relationships',
    risk: 'Risks',
    event: 'Events',
    causal: 'Causal Chains',
  };

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  return (
    <>
      {/* Search Trigger */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] text-muted-foreground">Search…</span>
        <kbd className="ml-2 rounded border border-border/50 bg-muted/30 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">⌘K</kbd>
      </button>

      {/* Search Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={() => { setIsOpen(false); setQuery(''); }}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search entities, relationships, risks, events…"
                  className="flex-1 bg-transparent font-display text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[50vh] overflow-y-auto">
                {query && results.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <span className="text-xs text-muted-foreground">No results for "{query}"</span>
                  </div>
                )}

                {Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-4 py-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {typeLabels[type]} ({items.length})
                      </span>
                    </div>
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                      >
                        <span className="text-base">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-medium text-foreground">{item.title}</div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground">{item.subtitle}</div>
                        </div>
                        {item.status && <SystemStateBadge status={item.status as any} />}
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ))}

                {!query && (
                  <div className="px-4 py-8 text-center">
                    <span className="text-xs text-muted-foreground">Type to search across the entire world model</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
