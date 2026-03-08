import { useState, useMemo } from 'react';
import { entities } from '@/data/worldModelData';
import { SystemStateBadge } from './SystemStateBadge';
import { motion } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Collect all timeline events across all entities, sorted by date
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

interface Props {
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
}

export function TimelineScrubber({ selectedEntityId, onEntitySelect }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    }).map(e => e.date);
  }, [allEvents]);

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
      }, 1200);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, allEvents.length]);

  const current = allEvents[currentIndex];
  if (!current) return null;

  const eventsAtCurrentTime = allEvents.filter(e => e.date === current.date);

  return (
    <div className="border-t border-border/50 bg-card/95 backdrop-blur-sm">
      {/* Current event detail */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-2">
        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{current.date}</span>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {eventsAtCurrentTime.map((evt, i) => (
            <button
              key={i}
              onClick={() => onEntitySelect(evt.entityId)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-muted/50 ${typeBorderColors[evt.type]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${typeColors[evt.type]}`} />
              <span className="font-mono text-[10px] text-foreground/70">{evt.entityName}</span>
              <span className="max-w-[200px] truncate text-[10px] text-muted-foreground">{evt.event}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber bar */}
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>

        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Timeline track */}
        <div className="relative flex-1">
          <div className="h-1 rounded-full bg-muted/50" />
          {/* Event markers */}
          <div className="absolute inset-0 flex items-center">
            {allEvents.map((evt, i) => {
              const pct = allEvents.length > 1 ? (i / (allEvents.length - 1)) * 100 : 50;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  <span className={`block h-2.5 w-1.5 rounded-sm transition-all ${
                    i === currentIndex ? 'scale-150 ' + typeColors[evt.type] : typeColors[evt.type] + '/40'
                  }`} />
                </button>
              );
            })}
          </div>
          {/* Progress line */}
          <div
            className="absolute left-0 top-0 h-1 rounded-full bg-primary/50 transition-all duration-300"
            style={{ width: `${allEvents.length > 1 ? (currentIndex / (allEvents.length - 1)) * 100 : 0}%` }}
          />
        </div>

        <button onClick={() => setCurrentIndex(Math.min(allEvents.length - 1, currentIndex + 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
          {currentIndex + 1}/{allEvents.length}
        </span>
      </div>
    </div>
  );
}
