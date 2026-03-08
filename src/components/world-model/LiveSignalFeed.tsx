import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Circle } from 'lucide-react';

interface SimulationTick {
  entityId: string;
  field: 'status' | 'metric';
  metricIndex?: number;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

interface Props {
  ticks: SimulationTick[];
  isLive: boolean;
  onToggle: () => void;
}

export function LiveSignalFeed({ ticks, isLive, onToggle }: Props) {
  return (
    <div className="absolute left-4 top-4 z-30 w-72">
      {/* Live indicator */}
      <button
        onClick={onToggle}
        className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
          isLive
            ? 'border-status-critical/40 bg-status-critical/10 text-status-critical'
            : 'border-border/50 bg-muted/30 text-muted-foreground'
        }`}
      >
        {isLive ? (
          <>
            <Circle className="h-2 w-2 animate-pulse fill-current" />
            Live Simulation Active
          </>
        ) : (
          <>
            <Radio className="h-3 w-3" />
            Simulation Paused
          </>
        )}
      </button>

      {/* Feed */}
      {isLive && ticks.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-hidden rounded-lg border border-border/30 bg-card/90 p-2 backdrop-blur-sm">
          <AnimatePresence initial={false}>
            {ticks.slice(0, 6).map((tick, i) => (
              <motion.div
                key={`${tick.entityId}-${tick.timestamp}-${tick.field}`}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 rounded-md bg-muted/20 px-2 py-1"
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    tick.field === 'status' ? 'bg-status-stressed' : 'bg-primary'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-foreground/80 truncate block">
                    {tick.entityId.replace(/-/g, ' ')}
                  </span>
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {tick.field === 'status'
                      ? `${tick.oldValue} → ${tick.newValue}`
                      : `${tick.oldValue} → ${tick.newValue}`}
                  </span>
                </div>
                <span className="font-mono text-[8px] text-muted-foreground/60">
                  {Math.round((Date.now() - tick.timestamp) / 1000)}s
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
