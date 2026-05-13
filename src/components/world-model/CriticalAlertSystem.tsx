import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, X, Volume2, VolumeX } from 'lucide-react';

interface SimulationTick {
  entityId: string;
  field: 'status' | 'metric';
  metricIndex?: number;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

type Severity = 'critical' | 'stressed';

interface StatusAlert {
  id: string;
  entityId: string;
  entityName: string;
  fromStatus: string;
  severity: Severity;
  timestamp: number;
}

interface Props {
  ticks: SimulationTick[];
  entityNames: Record<string, string>;
  onEntitySelect: (id: string) => void;
}

const STABLE_LIKE = new Set(['stable', 'recovering', 'uncertain']);

// Generate a short beep using Web Audio API. Critical = higher pitch + longer.
function playAlertSound(severity: Severity) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = severity === 'critical' ? 880 : 540;
    osc.type = 'sine';
    const dur = severity === 'critical' ? 0.4 : 0.25;
    gain.gain.setValueAtTime(severity === 'critical' ? 0.15 : 0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), (dur + 0.1) * 1000);
  } catch {
    // Audio not available
  }
}

export function CriticalAlertSystem({ ticks, entityNames, onEntitySelect }: Props) {
  const [alerts, setAlerts] = useState<StatusAlert[]>([]);
  const [flashSeverity, setFlashSeverity] = useState<Severity | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const processedRef = useRef(new Set<string>());

  // Watch for stable→stressed and stable→critical (or any escalation into stressed/critical)
  useEffect(() => {
    const escalations = ticks.filter(t => {
      if (t.field !== 'status') return false;
      const wasOk = STABLE_LIKE.has(t.oldValue);
      const isCritical = t.newValue === 'critical' && t.oldValue !== 'critical';
      const isStressed = t.newValue === 'stressed' && wasOk;
      return isCritical || isStressed;
    });

    const newAlerts: StatusAlert[] = [];
    let highest: Severity | null = null;

    for (const tick of escalations) {
      const key = `${tick.entityId}-${tick.timestamp}-${tick.newValue}`;
      if (processedRef.current.has(key)) continue;
      processedRef.current.add(key);
      const severity: Severity = tick.newValue === 'critical' ? 'critical' : 'stressed';
      if (severity === 'critical') highest = 'critical';
      else if (highest !== 'critical') highest = 'stressed';
      newAlerts.push({
        id: key,
        entityId: tick.entityId,
        entityName: entityNames[tick.entityId] || tick.entityId.replace(/-/g, ' '),
        fromStatus: tick.oldValue,
        severity,
        timestamp: tick.timestamp,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      setFlashSeverity(highest);
      if (soundEnabled && highest) playAlertSound(highest);
      setTimeout(() => setFlashSeverity(null), 600);
    }
  }, [ticks, entityNames, soundEnabled]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setAlerts([]);
  }, []);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const stressedCount = alerts.length - criticalCount;
  const headerColor = criticalCount > 0 ? 'text-destructive' : 'text-status-stressed';

  return (
    <>
      {/* Screen flash overlay */}
      <AnimatePresence>
        {flashSeverity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none fixed inset-0 z-[60] border-4 ${
              flashSeverity === 'critical' ? 'border-destructive/60' : 'border-status-stressed/50'
            }`}
            style={{
              boxShadow: flashSeverity === 'critical'
                ? 'inset 0 0 100px rgba(239, 68, 68, 0.15)'
                : 'inset 0 0 80px rgba(234, 130, 50, 0.12)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Alert toast stack */}
      {alerts.length > 0 && (
        <div className="fixed right-4 top-16 z-50 flex w-80 flex-col gap-2">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[9px] uppercase tracking-wider ${headerColor}`}>
              {criticalCount > 0 && `${criticalCount} Critical`}
              {criticalCount > 0 && stressedCount > 0 && ' · '}
              {stressedCount > 0 && `${stressedCount} Stressed`}
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
            {alerts.slice(0, 4).map(alert => {
              const isCritical = alert.severity === 'critical';
              const Icon = isCritical ? AlertTriangle : AlertCircle;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className={`group flex items-start gap-2.5 rounded-lg border p-3 backdrop-blur-sm ${
                    isCritical
                      ? 'border-destructive/30 bg-destructive/10'
                      : 'border-status-stressed/30 bg-status-stressed/10'
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    isCritical ? 'bg-destructive/20' : 'bg-status-stressed/20'
                  }`}>
                    <Icon className={`h-3 w-3 ${isCritical ? 'text-destructive' : 'text-status-stressed'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onEntitySelect(alert.entityId)}
                      className="block truncate font-mono text-xs font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {alert.entityName}
                    </button>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      Transitioned to{' '}
                      <span className={`font-semibold ${isCritical ? 'text-destructive' : 'text-status-stressed'}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {' '}from {alert.fromStatus}
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
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
