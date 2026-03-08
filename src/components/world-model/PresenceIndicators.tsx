import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

interface Analyst {
  id: string;
  name: string;
  initials: string;
  color: string;
  cursorX: number;
  cursorY: number;
  viewing: string | null; // entity id
  action: string;
  lastActive: number;
}

const ANALYST_POOL: Omit<Analyst, 'cursorX' | 'cursorY' | 'viewing' | 'action' | 'lastActive'>[] = [
  { id: 'a1', name: 'Dr. Amara Osei', initials: 'AO', color: 'hsl(200, 80%, 60%)' },
  { id: 'a2', name: 'Kai Tanaka', initials: 'KT', color: 'hsl(340, 70%, 60%)' },
  { id: 'a3', name: 'Elena Voronova', initials: 'EV', color: 'hsl(140, 60%, 55%)' },
  { id: 'a4', name: 'Marcus Chen', initials: 'MC', color: 'hsl(40, 80%, 55%)' },
];

const ACTIONS = [
  'reviewing metrics',
  'analyzing risk',
  'tracing dependencies',
  'writing annotation',
  'running scenario',
  'inspecting evidence',
  'viewing timeline',
  'idle',
];

const ENTITY_IDS = [
  'river-tana', 'masinga-dam', 'mwea-irrigation', 'tana-county-govt',
  'pastoralist-community', 'regional-trade', 'flood-health', 'delta-ecosystem', 'seven-forks'
];

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedEntityId: string | null;
}

export function PresenceIndicators({ containerRef, selectedEntityId }: Props) {
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  // Initialize simulated analysts
  useEffect(() => {
    const active = ANALYST_POOL.slice(0, 2 + Math.floor(Math.random() * 2)).map(a => ({
      ...a,
      cursorX: 100 + Math.random() * 600,
      cursorY: 100 + Math.random() * 400,
      viewing: ENTITY_IDS[Math.floor(Math.random() * ENTITY_IDS.length)],
      action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
      lastActive: Date.now(),
    }));
    setAnalysts(active);
  }, []);

  // Simulate cursor movement and activity
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysts(prev => prev.map(a => {
        const dx = (Math.random() - 0.5) * 40;
        const dy = (Math.random() - 0.5) * 30;
        const maxW = containerRef.current?.clientWidth || 800;
        const maxH = containerRef.current?.clientHeight || 600;
        const shouldChangeEntity = Math.random() < 0.15;
        const shouldChangeAction = Math.random() < 0.2;
        return {
          ...a,
          cursorX: Math.max(20, Math.min(maxW - 20, a.cursorX + dx)),
          cursorY: Math.max(20, Math.min(maxH - 20, a.cursorY + dy)),
          viewing: shouldChangeEntity ? ENTITY_IDS[Math.floor(Math.random() * ENTITY_IDS.length)] : a.viewing,
          action: shouldChangeAction ? ACTIONS[Math.floor(Math.random() * ACTIONS.length)] : a.action,
          lastActive: Date.now(),
        };
      }));
    }, 800);
    return () => clearInterval(interval);
  }, [containerRef]);

  // Occasionally add/remove analysts
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysts(prev => {
        if (Math.random() < 0.1 && prev.length < 4) {
          const available = ANALYST_POOL.filter(a => !prev.find(p => p.id === a.id));
          if (available.length > 0) {
            const newA = available[0];
            return [...prev, {
              ...newA,
              cursorX: 200 + Math.random() * 400,
              cursorY: 150 + Math.random() * 300,
              viewing: ENTITY_IDS[Math.floor(Math.random() * ENTITY_IDS.length)],
              action: 'just joined',
              lastActive: Date.now(),
            }];
          }
        }
        if (Math.random() < 0.05 && prev.length > 1) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Cursors on the canvas */}
      <AnimatePresence>
        {analysts.map(a => (
          <motion.div
            key={a.id}
            className="pointer-events-none absolute z-30"
            animate={{ x: a.cursorX, y: a.cursorY }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {/* Cursor arrow */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="-translate-x-0.5 -translate-y-0.5">
              <path d="M1 1L6.5 18L8.5 10.5L16 8.5L1 1Z" fill={a.color} fillOpacity={0.9} stroke={a.color} strokeWidth="0.5"/>
            </svg>
            {/* Name tag */}
            <div
              className="ml-3 -mt-1 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow-sm"
              style={{ backgroundColor: a.color }}
            >
              {a.name.split(' ')[0]}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Presence badge (bottom-right) */}
      <div className="absolute bottom-3 right-3 z-40">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
        >
          {/* Stacked avatars */}
          <div className="flex -space-x-1.5">
            {analysts.slice(0, 3).map(a => (
              <div
                key={a.id}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-background text-[8px] font-bold text-white"
                style={{ backgroundColor: a.color }}
              >
                {a.initials}
              </div>
            ))}
            {analysts.length > 3 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[8px] font-bold text-muted-foreground">
                +{analysts.length - 3}
              </div>
            )}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">{analysts.length} online</span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-stable" />
        </button>

        {/* Presence panel */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-border/50 bg-card/95 p-3 shadow-xl backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Active Analysts</span>
              </div>
              <div className="space-y-2">
                {analysts.map(a => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border/30 px-2.5 py-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: a.color }}
                    >
                      {a.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-foreground">{a.name}</div>
                      <div className="truncate text-[9px] text-muted-foreground">{a.action}</div>
                    </div>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-stable" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
