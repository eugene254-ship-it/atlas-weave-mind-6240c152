import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Volume2, VolumeX } from 'lucide-react';
import { type EntityStatus } from '@/data/worldModelData';

interface SimulationTick {
  entityId: string;
  field: 'status' | 'metric';
  metricIndex?: number;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

interface CriticalAlert {
  id: string;
  entityId: string;
  entityName: string;
  fromStatus: string;
  timestamp: number;
}

interface Props {
  ticks: SimulationTick[];
  entityNames: Record<string, string>;
  onEntitySelect: (id: string) => void;
}

// Generate a short beep using Web Audio API
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available
  }
}

export function CriticalAlertSystem({ ticks, entityNames, onEntitySelect }: Props) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [flashActive, setFlashActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const processedRef = useRef(new Set<string>());

  // Watch for critical transitions
  useEffect(() => {
    const criticalTicks = ticks.filter(
      t => t.field === 'status' && t.newValue === 'critical' && t.oldValue !== 'critical'
    );

    const newAlerts: CriticalAlert[] = [];
    for (const tick of criticalTicks) {
      const key = `${tick.entityId}-${tick.timestamp}`;
      if (processedRef.current.has(key)) continue;
      processedRef.current.add(key);
      newAlerts.push({
        id: key,
        entityId: tick.entityId,
        entityName: entityNames[tick.entityId] || tick.entityId.replace(/-/g, ' '),
        fromStatus: tick.oldValue,
        timestamp: tick.timestamp,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      setFlashActive(true);
      if (soundEnabled) playAlertSound();
      setTimeout(() => setFlashActive(false), 600);
    }
  }, [ticks, entityNames, soundEnabled]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <>
      {/* Screen flash overlay */}
      <AnimatePresence>
        {flashActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed inset-0 z-[60] border-4 border-destructive/60"
            style={{ boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.15)' }}
          />
        )}
      </AnimatePresence>

      {/* Alert toast stack */}
      {alerts.length > 0 && (
        <div className="fixed right-4 top-16 z-50 flex w-80 flex-col gap-2">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-destructive">
              {alerts.length} Critical Alert{alerts.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
              >
                {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              </button>
              <button
                onClick={dismissAll}
                className="rounded px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {alerts.slice(0, 4).map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="group flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 backdrop-blur-sm"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onEntitySelect(alert.entityId)}
                    className="block truncate font-mono text-xs font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {alert.entityName}
                  </button>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    Transitioned to <span className="text-destructive font-semibold">CRITICAL</span> from {alert.fromStatus}
                  </span>
                  <span className="ml-2 font-mono text-[8px] text-muted-foreground/60">
                    {Math.round((Date.now() - alert.timestamp) / 1000)}s ago
                  </span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
