import { useEffect, useRef, useCallback, useState } from 'react';
import { entities as baseEntities, type WorldEntity, type EntityStatus } from '@/data/worldModelData';

interface SimulationTick {
  entityId: string;
  field: 'status' | 'metric';
  metricIndex?: number;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

const statuses: EntityStatus[] = ['stable', 'stressed', 'critical', 'recovering', 'uncertain', 'degraded'];
const statusTransitions: Record<EntityStatus, EntityStatus[]> = {
  stable: ['stable', 'stable', 'stressed'],
  stressed: ['stressed', 'stressed', 'critical', 'stable', 'recovering'],
  critical: ['critical', 'critical', 'stressed', 'recovering'],
  recovering: ['recovering', 'stable', 'stressed'],
  uncertain: ['uncertain', 'stressed', 'stable'],
  degraded: ['degraded', 'stressed', 'critical'],
};

function perturbMetric(value: string): string {
  // Try to perturb numeric values
  const numMatch = value.match(/^([+-]?)([\d.]+)(.*)$/);
  if (numMatch) {
    const sign = numMatch[1];
    const num = parseFloat(numMatch[2]);
    const suffix = numMatch[3];
    const delta = num * (Math.random() * 0.06 - 0.03); // ±3%
    const newNum = Math.max(0, num + delta);
    const formatted = num >= 100 ? Math.round(newNum).toString() : newNum.toFixed(num % 1 === 0 ? 0 : num.toString().split('.')[1]?.length || 1);
    return `${sign}${formatted}${suffix}`;
  }
  return value;
}

export function useRealtimeSimulation(enabled: boolean) {
  const [liveEntities, setLiveEntities] = useState<WorldEntity[]>(() => 
    baseEntities.map(e => ({ ...e, metrics: e.metrics.map(m => ({ ...m })) }))
  );
  const [ticks, setTicks] = useState<SimulationTick[]>([]);
  const [isLive, setIsLive] = useState(enabled);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const tick = useCallback(() => {
    setLiveEntities(prev => {
      const newEntities = [...prev];
      const idx = Math.floor(Math.random() * newEntities.length);
      const entity = { ...newEntities[idx], metrics: newEntities[idx].metrics.map(m => ({ ...m })) };

      const tickLog: SimulationTick[] = [];

      // Maybe change status (20% chance)
      if (Math.random() < 0.2) {
        const transitions = statusTransitions[entity.status];
        const newStatus = transitions[Math.floor(Math.random() * transitions.length)];
        if (newStatus !== entity.status) {
          tickLog.push({
            entityId: entity.id,
            field: 'status',
            oldValue: entity.status,
            newValue: newStatus,
            timestamp: Date.now(),
          });
          entity.status = newStatus;
        }
      }

      // Perturb a metric (60% chance)
      if (entity.metrics.length > 0 && Math.random() < 0.6) {
        const mi = Math.floor(Math.random() * entity.metrics.length);
        const oldVal = entity.metrics[mi].value;
        const newVal = perturbMetric(oldVal);
        if (newVal !== oldVal) {
          tickLog.push({
            entityId: entity.id,
            field: 'metric',
            metricIndex: mi,
            oldValue: oldVal,
            newValue: newVal,
            timestamp: Date.now(),
          });
          entity.metrics[mi].value = newVal;
          // Randomly flip trend
          if (Math.random() < 0.15) {
            const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
            entity.metrics[mi].trend = trends[Math.floor(Math.random() * trends.length)];
          }
        }
      }

      newEntities[idx] = entity;

      if (tickLog.length > 0) {
        setTicks(prev => [...tickLog, ...prev].slice(0, 50));
      }

      return newEntities;
    });
  }, []);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(tick, 2000 + Math.random() * 2000);
      return () => clearInterval(intervalRef.current);
    } else {
      clearInterval(intervalRef.current);
    }
  }, [isLive, tick]);

  return { liveEntities, ticks, isLive, setIsLive };
}
