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

function fmtHour(h: number) { return `${String(h).padStart(2, '0')}:00`; }

function QuietHoursPreview({ settings }: { settings: NotificationSettings }) {
  const now = new Date();
  const active = isInQuietHours(settings, now);
  // Compute next transition
  const h = now.getHours();
  let nextLabel = '';
  if (active) {
    nextLabel = `Sound resumes at ${fmtHour(settings.quietEnd)}`;
  } else {
    nextLabel = `Quiet starts at ${fmtHour(settings.quietStart)}`;
  }
  // 24-hour timeline blocks
  const blocks = Array.from({ length: 24 }, (_, i) => {
    let inQuiet: boolean;
    if (settings.quietStart === settings.quietEnd) inQuiet = false;
    else if (settings.quietStart < settings.quietEnd) inQuiet = i >= settings.quietStart && i < settings.quietEnd;
    else inQuiet = i >= settings.quietStart || i < settings.quietEnd;
    return { hour: i, quiet: inQuiet, current: i === h };
  });
  return (
    <div className="mt-3 rounded-md border border-border/40 bg-muted/10 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {active ? <BellOff className="h-3 w-3 text-status-stable" /> : <Bell className="h-3 w-3 text-foreground/70" />}
          Now: {active ? 'Quiet' : 'Active'}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">{nextLabel}</span>
      </div>
      <div className="mt-2 flex h-4 overflow-hidden rounded-sm border border-border/40">
        {blocks.map(b => (
          <div
            key={b.hour}
            title={`${fmtHour(b.hour)} ${b.quiet ? '· quiet' : '· alerts on'}`}
            className={`relative flex-1 ${b.quiet ? 'bg-muted/60' : 'bg-primary/30'}`}
          >
            {b.current && <div className="absolute inset-y-0 left-0 w-px bg-foreground" />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[8px] text-muted-foreground/60">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

function TestButton({ severity, disabled, quiet, soundOff, onPlay }: {
  severity: Severity; disabled: boolean; quiet: boolean; soundOff: boolean; onPlay: () => void;
}) {
  const [pulsing, setPulsing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isCritical = severity === 'critical';
  const Icon = isCritical ? AlertTriangle : AlertCircle;
  const handleClick = () => {
    if (!soundOff && !quiet) onPlay();
    setPulsing(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPulsing(false), 600);
  };
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const muted = disabled || soundOff || quiet;
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`group relative flex flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-all ${
        disabled
          ? 'cursor-not-allowed border-border/30 bg-muted/10 opacity-50'
          : isCritical
            ? 'border-status-critical/30 bg-status-critical/5 hover:bg-status-critical/10'
            : 'border-status-stressed/30 bg-status-stressed/5 hover:bg-status-stressed/10'
      } ${pulsing ? 'ring-2 ring-offset-1 ring-offset-card ' + (isCritical ? 'ring-status-critical/60' : 'ring-status-stressed/60') : ''}`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${isCritical ? 'text-status-critical' : 'text-status-stressed'}`} />
        <span className="font-mono text-[10px] font-medium text-foreground">Test {severity}</span>
        <Play className="h-2.5 w-2.5 text-muted-foreground" />
      </span>
      <span className="font-mono text-[8px] text-muted-foreground">
        {disabled ? 'Severity disabled' : muted ? (quiet ? 'Quiet hours · silent' : 'Sound off · silent') : `${isCritical ? '880' : '540'}Hz tone`}
      </span>
    </button>
  );
}
