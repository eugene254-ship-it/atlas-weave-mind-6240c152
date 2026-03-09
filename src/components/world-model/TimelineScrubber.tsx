import { useState, useMemo } from 'react';
import { entities } from '@/data/worldModelData';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

interface TimelineEvent {
  date: string;
  event: string;
  type: 'info' | 'warning' | 'critical' | 'recovery';
  entityId: string;
  entityName: string;
  sortKey: number;
}

function dateToSortKey(dateStr: string): number {
  const months: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  };
  const parts = dateStr.split(' ');
  const month = months[parts[0]] || 1;
  const year = parseInt(parts[1]) || 2025;
  return year * 100 + month;
}

const typeColors: Record<string, string> = {
  info: 'bg-primary/60',
  warning: 'bg-status-stressed',
  critical: 'bg-status-critical',
  recovery: 'bg-status-stable',
};

const typeBorderColors: Record<string, string> = {
  info: 'border-primary/30',
  warning: 'border-status-stressed/30',
  critical: 'border-status-critical/30',
  recovery: 'border-status-stable/30',
};

const speedOptions = [0.5, 1, 2, 4];

interface TimelineFork {
  id: string;
  name: string;
  forkPoint: string;
  color: string;
}

interface Props {
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
  forks?: TimelineFork[];
}

export function TimelineScrubber({ selectedEntityId, onEntitySelect }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const allEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    for (const entity of entities) {
      for (const t of entity.timeline) {
        events.push({
          date: t.date,
          event: t.event,
          type: t.type,
          entityId: entity.id,
          entityName: entity.name,
          sortKey: dateToSortKey(t.date),
        });
      }
    }
    return events.sort((a, b) => a.sortKey - b.sortKey);
  }, []);

  const uniqueMonths = useMemo(() => {
    const seen = new Set<string>();
    return allEvents.filter(e => {
      if (seen.has(e.date)) return false;
      seen.add(e.date);
      return true;
    }).map(e => ({ date: e.date, sortKey: e.sortKey }));
  }, [allEvents]);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= allEvents.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200 / speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, allEvents.length, speed]);

  // Track drag scrubbing
  const handleTrackInteraction = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (allEvents.length - 1));
    setCurrentIndex(idx);
  }, [allEvents.length]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    handleTrackInteraction(e.clientX);
  }, [handleTrackInteraction]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleTrackInteraction(e.clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, handleTrackInteraction]);

  const cycleSpeed = () => {
    const idx = speedOptions.indexOf(speed);
    setSpeed(speedOptions[(idx + 1) % speedOptions.length]);
  };

  const jumpToStart = () => { setCurrentIndex(0); setIsPlaying(false); };
  const jumpToEnd = () => { setCurrentIndex(allEvents.length - 1); setIsPlaying(false); };

  const current = allEvents[currentIndex];
  if (!current) return null;

  const eventsAtCurrentTime = allEvents.filter(e => e.date === current.date);
  const progressPct = allEvents.length > 1 ? (currentIndex / (allEvents.length - 1)) * 100 : 0;

  return (
    <div className="border-t border-border/50 bg-card/95 backdrop-blur-sm">
      {/* Current event detail */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-2">
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
        <AnimatePresence mode="wait">
          <motion.span
            key={current.date}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="font-mono text-[10px] uppercase tracking-wider text-primary"
          >
            {current.date}
          </motion.span>
        </AnimatePresence>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          <AnimatePresence mode="popLayout">
            {eventsAtCurrentTime.map((evt, i) => (
              <motion.button
                key={`${evt.entityId}-${evt.event}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onEntitySelect(evt.entityId)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-muted/50 ${typeBorderColors[evt.type]} ${
                  evt.entityId === selectedEntityId ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${typeColors[evt.type]}`} />
                <span className="font-mono text-[10px] text-foreground/70">{evt.entityName}</span>
                <span className="max-w-[200px] truncate text-[10px] text-muted-foreground">{evt.event}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Scrubber bar */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <button onClick={jumpToStart} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground" title="Jump to start">
            <SkipBack className="h-3 w-3" />
          </button>
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
          </button>
          <button onClick={() => setCurrentIndex(Math.min(allEvents.length - 1, currentIndex + 1))} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button onClick={jumpToEnd} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground" title="Jump to end">
            <SkipForward className="h-3 w-3" />
          </button>
        </div>

        {/* Speed button */}
        <button
          onClick={cycleSpeed}
          className="shrink-0 rounded border border-border/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          title="Playback speed"
        >
          {speed}×
        </button>

        {/* Timeline track (draggable) */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          className="relative flex-1 cursor-pointer py-2"
        >
          {/* Background track */}
          <div className="h-1.5 rounded-full bg-muted/40" />

          {/* Month labels */}
          <div className="absolute inset-x-0 top-full mt-0.5 flex justify-between">
            {uniqueMonths.filter((_, i) => i % Math.max(1, Math.floor(uniqueMonths.length / 6)) === 0).map(m => {
              const pct = allEvents.length > 1 
                ? (allEvents.findIndex(e => e.date === m.date) / (allEvents.length - 1)) * 100 
                : 50;
              return (
                <span
                  key={m.date}
                  className="absolute -translate-x-1/2 font-mono text-[8px] text-muted-foreground/50"
                  style={{ left: `${pct}%` }}
                >
                  {m.date}
                </span>
              );
            })}
          </div>

          {/* Event markers */}
          <div className="absolute inset-0 flex items-center py-2">
            {allEvents.map((evt, i) => {
              const pct = allEvents.length > 1 ? (i / (allEvents.length - 1)) * 100 : 50;
              const isActive = i === currentIndex;
              const isHighlighted = evt.entityId === selectedEntityId;
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  <div className={`rounded-sm transition-all ${typeColors[evt.type]} ${
                    isActive ? 'h-3.5 w-2 scale-110' : isHighlighted ? 'h-2.5 w-1.5 opacity-80' : 'h-2 w-1 opacity-40'
                  }`} />
                </div>
              );
            })}
          </div>

          {/* Progress fill */}
          <div
            className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary/40 transition-all"
            style={{ width: `${progressPct}%`, transitionDuration: isDragging ? '0ms' : '200ms' }}
          />

          {/* Playhead */}
          <motion.div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${progressPct}%` }}
            animate={{ left: `${progressPct}%` }}
            transition={{ duration: isDragging ? 0 : 0.2 }}
          >
            <div className="h-4 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
          </motion.div>
        </div>

        {/* Counter */}
        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
          {currentIndex + 1}/{allEvents.length}
        </span>
      </div>
    </div>
  );
}
