import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Volume2, AlertTriangle, AlertCircle, Moon, Play, BellOff } from 'lucide-react';

type Severity = 'critical' | 'stressed';

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
  } catch {/* ignore */}
}

export interface NotificationSettings {
  soundEnabled: boolean;
  alertOnStressed: boolean;
  alertOnCritical: boolean;
  quietHoursEnabled: boolean;
  quietStart: number; // hour 0-23
  quietEnd: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  alertOnStressed: true,
  alertOnCritical: true,
  quietHoursEnabled: false,
  quietStart: 22,
  quietEnd: 7,
};

const STORAGE_KEY = 'atlas:notification-settings';

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {/* ignore */}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function isInQuietHours(s: NotificationSettings, now = new Date()): boolean {
  if (!s.quietHoursEnabled) return false;
  const h = now.getHours();
  if (s.quietStart === s.quietEnd) return false;
  if (s.quietStart < s.quietEnd) return h >= s.quietStart && h < s.quietEnd;
  // wraps midnight
  return h >= s.quietStart || h < s.quietEnd;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onChange: (s: NotificationSettings) => void;
}

export function NotificationSettingsPanel({ isOpen, onClose, settings, onChange }: Props) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => { if (isOpen) setDraft(settings); }, [isOpen, settings]);

  const update = useCallback((patch: Partial<NotificationSettings>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      onChange(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {/* ignore */}
      return next;
    });
  }, [onChange]);

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
            className="w-full max-w-md rounded-xl border border-border/50 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">Notification Settings</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Alert preferences
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {/* Sound */}
              <ToggleRow
                icon={<Volume2 className="h-3.5 w-3.5 text-foreground/70" />}
                label="Alert sound"
                hint="Play tone when entities escalate"
                checked={draft.soundEnabled}
                onChange={v => update({ soundEnabled: v })}
              />

              <div className="border-t border-border/30" />

              {/* Severity toggles */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Alert types</span>
                <div className="mt-2 space-y-2">
                  <ToggleRow
                    icon={<AlertCircle className="h-3.5 w-3.5 text-status-stressed" />}
                    label="Stable → Stressed"
                    hint="Notify on initial degradation"
                    checked={draft.alertOnStressed}
                    onChange={v => update({ alertOnStressed: v })}
                  />
                  <ToggleRow
                    icon={<AlertTriangle className="h-3.5 w-3.5 text-status-critical" />}
                    label="Stable → Critical"
                    hint="Notify on critical escalation"
                    checked={draft.alertOnCritical}
                    onChange={v => update({ alertOnCritical: v })}
                  />
                </div>
              </div>

              <div className="border-t border-border/30" />

              {/* Quiet hours */}
              <div>
                <ToggleRow
                  icon={<Moon className="h-3.5 w-3.5 text-foreground/70" />}
                  label="Quiet hours"
                  hint="Suppress sound during this window"
                  checked={draft.quietHoursEnabled}
                  onChange={v => update({ quietHoursEnabled: v })}
                />
                {draft.quietHoursEnabled && (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <HourSelect
                        label="From"
                        value={draft.quietStart}
                        onChange={v => update({ quietStart: v })}
                      />
                      <HourSelect
                        label="To"
                        value={draft.quietEnd}
                        onChange={v => update({ quietEnd: v })}
                      />
                    </div>
                    <QuietHoursPreview settings={draft} />
                  </>
                )}
              </div>

              <div className="border-t border-border/30" />

              {/* Test alerts */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Test alerts</span>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  Preview the tone and severity feedback before live alerts fire.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <TestButton
                    severity="stressed"
                    disabled={!draft.alertOnStressed}
                    quiet={isInQuietHours(draft)}
                    soundOff={!draft.soundEnabled}
                    onPlay={() => playAlertSound('stressed')}
                  />
                  <TestButton
                    severity="critical"
                    disabled={!draft.alertOnCritical}
                    quiet={isInQuietHours(draft)}
                    soundOff={!draft.soundEnabled}
                    onPlay={() => playAlertSound('critical')}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <span className="font-mono text-[9px] text-muted-foreground">Saved automatically</span>
              <button
                onClick={onClose}
                className="rounded-md bg-primary/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/25"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleRow({ icon, label, hint, checked, onChange }: {
  icon: React.ReactNode; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/30">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] font-medium text-foreground">{label}</div>
        <div className="font-mono text-[9px] text-muted-foreground">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  );
}

function HourSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
        ))}
      </select>
    </label>
  );
}
