import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageCircle, AlertTriangle, Edit3, Eye, GitMerge, Bell, X, Check } from 'lucide-react';

// --- Types ---

interface AnalystActivity {
  id: string;
  analystId: string;
  analystName: string;
  analystColor: string;
  action: 'edit' | 'view' | 'annotate' | 'scenario' | 'link' | 'alert_ack';
  entityId: string | null;
  entityName: string;
  detail: string;
  timestamp: number;
}

interface ConflictEvent {
  id: string;
  entityId: string;
  entityName: string;
  field: string;
  analyst1: { name: string; color: string; value: string };
  analyst2: { name: string; color: string; value: string };
  timestamp: number;
  resolved: boolean;
  resolution?: 'accept1' | 'accept2' | 'merge';
}

// --- Simulated Data ---

const ANALYSTS = [
  { id: 'a1', name: 'Dr. Amara Osei', initials: 'AO', color: 'hsl(200, 80%, 60%)' },
  { id: 'a2', name: 'Kai Tanaka', initials: 'KT', color: 'hsl(340, 70%, 60%)' },
  { id: 'a3', name: 'Elena Voronova', initials: 'EV', color: 'hsl(140, 60%, 55%)' },
  { id: 'a4', name: 'Marcus Chen', initials: 'MC', color: 'hsl(40, 80%, 55%)' },
];

const ENTITY_NAMES: Record<string, string> = {
  'river-tana': 'Tana River Basin',
  'dam-masinga': 'Masinga Dam Complex',
  'irrigation-mwea': 'Mwea Irrigation',
  'water-nairobi': 'Nairobi Water Supply',
  'community-kibera': 'Kibera Community',
  'food-nairobi': 'Nairobi Food Markets',
  'health-nairobi': 'Nairobi Health System',
  'forest-upper-tana': 'Upper Tana Forest',
  'hydro-kindaruma': 'Kindaruma Power',
  'rainfall-east': 'Eastern Kenya Rainfall',
};

const ENTITY_IDS = Object.keys(ENTITY_NAMES);

const ACTION_TEMPLATES: { action: AnalystActivity['action']; details: string[] }[] = [
  { action: 'edit', details: ['updated risk assessment', 'modified metric threshold', 'changed confidence level', 'adjusted dependency weight'] },
  { action: 'view', details: ['inspecting dependencies', 'reviewing timeline', 'analyzing metrics', 'checking evidence'] },
  { action: 'annotate', details: ['added field note', 'flagged for review', 'linked reference doc', 'noted discrepancy'] },
  { action: 'scenario', details: ['running drought simulation', 'testing reforestation branch', 'comparing infrastructure scenarios'] },
  { action: 'link', details: ['proposed new dependency', 'strengthened link', 'added cross-system connection'] },
  { action: 'alert_ack', details: ['acknowledged critical alert', 'escalated to supervisor', 'initiated response protocol'] },
];

const CONFLICT_TEMPLATES = [
  { field: 'Status', val1: 'stressed', val2: 'critical' },
  { field: 'Risk Level', val1: 'Medium', val2: 'High' },
  { field: 'Confidence', val1: 'High', val2: 'Medium' },
  { field: 'Priority', val1: 'P2', val2: 'P1' },
  { field: 'Trend Direction', val1: 'Stable', val2: 'Declining' },
];

const actionIcons: Record<string, typeof Edit3> = {
  edit: Edit3,
  view: Eye,
  annotate: MessageCircle,
  scenario: GitMerge,
  link: GitMerge,
  alert_ack: AlertTriangle,
};

const actionColors: Record<string, string> = {
  edit: 'text-status-stressed',
  view: 'text-muted-foreground',
  annotate: 'text-primary',
  scenario: 'text-status-recovering',
  link: 'text-status-recovering',
  alert_ack: 'text-status-critical',
};

// --- Component ---

interface Props {
  onEntitySelect: (id: string) => void;
}

export function CollaborationSystem({ onEntitySelect }: Props) {
  const [activities, setActivities] = useState<AnalystActivity[]>([]);
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate simulated activity
  useEffect(() => {
    const interval = setInterval(() => {
      const analyst = ANALYSTS[Math.floor(Math.random() * ANALYSTS.length)];
      const template = ACTION_TEMPLATES[Math.floor(Math.random() * ACTION_TEMPLATES.length)];
      const entityId = ENTITY_IDS[Math.floor(Math.random() * ENTITY_IDS.length)];
      const detail = template.details[Math.floor(Math.random() * template.details.length)];

      const activity: AnalystActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        analystId: analyst.id,
        analystName: analyst.name,
        analystColor: analyst.color,
        action: template.action,
        entityId,
        entityName: ENTITY_NAMES[entityId] || entityId,
        detail,
        timestamp: Date.now(),
      };

      setActivities(prev => [activity, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    }, 4000 + Math.random() * 6000);

    return () => clearInterval(interval);
  }, []);

  // Generate simulated conflicts (rare)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) return;

      const a1 = ANALYSTS[Math.floor(Math.random() * 2)];
      const a2 = ANALYSTS[2 + Math.floor(Math.random() * 2)];
      const entityId = ENTITY_IDS[Math.floor(Math.random() * ENTITY_IDS.length)];
      const template = CONFLICT_TEMPLATES[Math.floor(Math.random() * CONFLICT_TEMPLATES.length)];

      const conflict: ConflictEvent = {
        id: `conf-${Date.now()}`,
        entityId,
        entityName: ENTITY_NAMES[entityId] || entityId,
        field: template.field,
        analyst1: { name: a1.name, color: a1.color, value: template.val1 },
        analyst2: { name: a2.name, color: a2.color, value: template.val2 },
        timestamp: Date.now(),
        resolved: false,
      };

      setConflicts(prev => [conflict, ...prev].slice(0, 10));
    }, 15000 + Math.random() * 10000);

    return () => clearInterval(interval);
  }, []);

  const resolveConflict = useCallback((id: string, resolution: 'accept1' | 'accept2' | 'merge') => {
    setConflicts(prev => prev.map(c =>
      c.id === id ? { ...c, resolved: true, resolution } : c
    ));
  }, []);

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const editActivities = activities.filter(a => a.action === 'edit' || a.action === 'annotate' || a.action === 'link');

  return (
    <>
      {/* Notification bell - top-left floating */}
      <div className="absolute left-4 bottom-3 z-40 flex items-center gap-2">
        {/* Activity feed button */}
        <button
          onClick={() => { setShowPanel(!showPanel); setShowConflicts(false); setUnreadCount(0); }}
          className="relative flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
        >
          <Bell className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground">Activity</span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[8px] font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Conflict indicator */}
        {unresolvedConflicts.length > 0 && (
          <button
            onClick={() => { setShowConflicts(!showConflicts); setShowPanel(false); }}
            className="flex items-center gap-1.5 rounded-lg border border-status-stressed/40 bg-status-stressed/10 px-2.5 py-1.5 shadow-lg backdrop-blur-sm transition-colors hover:bg-status-stressed/20"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-status-stressed" />
            <span className="font-mono text-[10px] text-status-stressed">
              {unresolvedConflicts.length} conflict{unresolvedConflicts.length > 1 ? 's' : ''}
            </span>
          </button>
        )}
      </div>

      {/* Activity feed panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-12 left-4 z-50 w-80 rounded-xl border border-border/50 bg-card/95 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-border/30 p-3">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Activity Feed</span>
              </div>
              <button onClick={() => setShowPanel(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {activities.length === 0 ? (
                <div className="py-6 text-center font-mono text-[10px] text-muted-foreground">No activity yet</div>
              ) : (
                <div className="space-y-1">
                  {activities.slice(0, 15).map(act => {
                    const Icon = actionIcons[act.action] || Eye;
                    return (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/30"
                      >
                        <div
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ backgroundColor: act.analystColor }}
                        >
                          {act.analystName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-medium text-foreground">
                              {act.analystName.split(' ')[0]}
                            </span>
                            <Icon className={`h-3 w-3 ${actionColors[act.action]}`} />
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {act.detail}
                            {act.entityName && (
                              <button
                                onClick={() => { act.entityId && onEntitySelect(act.entityId); setShowPanel(false); }}
                                className="ml-1 text-primary/70 transition-colors hover:text-primary"
                              >
                                on {act.entityName}
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[8px] text-muted-foreground/50">
                          {Math.round((Date.now() - act.timestamp) / 1000)}s
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict resolution panel */}
      <AnimatePresence>
        {showConflicts && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-12 left-4 z-50 w-80 rounded-xl border border-status-stressed/30 bg-card/95 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-border/30 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-status-stressed" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-status-stressed">Edit Conflicts</span>
              </div>
              <button onClick={() => setShowConflicts(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-2">
              {conflicts.slice(0, 8).map(conf => (
                <div
                  key={conf.id}
                  className={`rounded-lg border p-3 ${
                    conf.resolved
                      ? 'border-border/20 bg-muted/10 opacity-60'
                      : 'border-status-stressed/30 bg-status-stressed/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onEntitySelect(conf.entityId)}
                      className="font-mono text-[10px] font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {conf.entityName}
                    </button>
                    <span className="rounded-full border border-border/40 bg-muted/30 px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
                      {conf.field}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-md border border-border/30 bg-muted/20 p-1.5">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: conf.analyst1.color }} />
                        <span className="font-mono text-[8px] text-muted-foreground">{conf.analyst1.name.split(' ')[0]}</span>
                      </div>
                      <span className="mt-0.5 block font-mono text-[10px] font-medium text-foreground">{conf.analyst1.value}</span>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground">vs</span>
                    <div className="flex-1 rounded-md border border-border/30 bg-muted/20 p-1.5">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: conf.analyst2.color }} />
                        <span className="font-mono text-[8px] text-muted-foreground">{conf.analyst2.name.split(' ')[0]}</span>
                      </div>
                      <span className="mt-0.5 block font-mono text-[10px] font-medium text-foreground">{conf.analyst2.value}</span>
                    </div>
                  </div>

                  {!conf.resolved ? (
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        onClick={() => resolveConflict(conf.id, 'accept1')}
                        className="flex-1 rounded-md bg-muted/30 py-1 font-mono text-[8px] text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                      >
                        Accept Left
                      </button>
                      <button
                        onClick={() => resolveConflict(conf.id, 'merge')}
                        className="flex-1 rounded-md bg-primary/10 py-1 font-mono text-[8px] text-primary transition-colors hover:bg-primary/20"
                      >
                        Merge
                      </button>
                      <button
                        onClick={() => resolveConflict(conf.id, 'accept2')}
                        className="flex-1 rounded-md bg-muted/30 py-1 font-mono text-[8px] text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                      >
                        Accept Right
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1 font-mono text-[8px] text-status-stable">
                      <Check className="h-3 w-3" />
                      Resolved via {conf.resolution === 'merge' ? 'merge' : conf.resolution === 'accept1' ? 'left' : 'right'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
