import { useMemo, useCallback, useEffect, useState } from 'react';
import { entities, relationships, nodePositions, entityTypeConfig, type WorldEntity } from '@/data/worldModelData';

interface CustomRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  confidence: 'high' | 'medium' | 'low';
  isCustom?: boolean;
}

interface Props {
  width: number;
  height: number;
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
  activeLayers: string[];
  hoveredEntityId: string | null;
  onEntityHover: (id: string | null) => void;
  showFlowParticles?: boolean;
  customRelationships?: CustomRelationship[];
}

const statusColorMap: Record<string, string> = {
  stable: 'hsl(155, 65%, 45%)',
  stressed: 'hsl(35, 90%, 55%)',
  critical: 'hsl(0, 72%, 55%)',
  recovering: 'hsl(200, 70%, 55%)',
  uncertain: 'hsl(270, 40%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
};

// Flow type colors for particles
const flowColors: Record<string, string> = {
  'supplies water to': 'hsl(200, 70%, 55%)',
  'regulates flow of': 'hsl(155, 65%, 45%)',
  'feeds into': 'hsl(200, 70%, 55%)',
  'allocates water to': 'hsl(200, 70%, 55%)',
  'supplies food to': 'hsl(45, 80%, 50%)',
  'feeds': 'hsl(45, 80%, 50%)',
  'supports': 'hsl(175, 70%, 50%)',
  'serves': 'hsl(175, 70%, 50%)',
  'sustains': 'hsl(155, 65%, 45%)',
  'replenishes': 'hsl(200, 70%, 55%)',
};

interface Particle {
  id: string;
  relId: string;
  progress: number;
  speed: number;
  color: string;
}

export function WorldCanvas({ width, height, selectedEntityId, onEntitySelect, activeLayers, hoveredEntityId, onEntityHover, showFlowParticles = true }: Props) {
  const pad = 60;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const [particles, setParticles] = useState<Particle[]>([]);

  const visibleEntities = useMemo(() =>
    entities.filter(e => activeLayers.includes(e.type)),
    [activeLayers]
  );

  const visibleIds = useMemo(() => new Set(visibleEntities.map(e => e.id)), [visibleEntities]);

  const visibleRelationships = useMemo(() =>
    relationships.filter(r => visibleIds.has(r.source) && visibleIds.has(r.target)),
    [visibleIds]
  );

  const getPos = useCallback((id: string) => {
    const p = nodePositions[id] || { x: 0.5, y: 0.5 };
    return { x: pad + p.x * w, y: pad + p.y * h };
  }, [w, h]);

  const isConnected = useCallback((entityId: string) => {
    if (!selectedEntityId) return true;
    if (entityId === selectedEntityId) return true;
    return relationships.some(r =>
      (r.source === selectedEntityId && r.target === entityId) ||
      (r.target === selectedEntityId && r.source === entityId)
    );
  }, [selectedEntityId]);

  // Flow particle animation
  useEffect(() => {
    if (!showFlowParticles) { setParticles([]); return; }

    // Initialize particles
    const initial: Particle[] = [];
    visibleRelationships.forEach((rel, ri) => {
      const count = Math.ceil(rel.strength * 3);
      for (let i = 0; i < count; i++) {
        initial.push({
          id: `${rel.id}-p${i}`,
          relId: rel.id,
          progress: (i / count),
          speed: 0.003 + Math.random() * 0.004,
          color: flowColors[rel.type] || 'hsl(175, 70%, 50%)',
        });
      }
    });
    setParticles(initial);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        progress: (p.progress + p.speed) % 1,
      })));
    }, 30);

    return () => clearInterval(interval);
  }, [showFlowParticles, visibleRelationships]);

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="particle-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(175, 70%, 50%)" opacity="0.4" />
        </marker>
      </defs>

      {/* Edges */}
      {visibleRelationships.map(r => {
        const s = getPos(r.source);
        const t = getPos(r.target);
        const isActive = selectedEntityId === r.source || selectedEntityId === r.target;
        const isHovered = hoveredEntityId === r.source || hoveredEntityId === r.target;
        return (
          <g key={r.id}>
            <line
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={isActive ? 'hsl(175, 70%, 50%)' : 'hsl(220, 15%, 20%)'}
              strokeWidth={isActive ? 2 : isHovered ? 1.5 : 0.8}
              strokeOpacity={isActive ? 0.6 : isHovered ? 0.4 : 0.15}
              strokeDasharray={r.confidence === 'low' ? '4,4' : r.confidence === 'medium' ? '8,4' : 'none'}
              markerEnd="url(#arrowhead)"
            />
            {isActive && (
              <line
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="hsl(175, 70%, 50%)"
                strokeWidth={1}
                strokeOpacity={0.3}
                strokeDasharray="4,4"
                className="animate-flow"
              />
            )}
          </g>
        );
      })}

      {/* Flow Particles */}
      {showFlowParticles && particles.map(particle => {
        const rel = visibleRelationships.find(r => r.id === particle.relId);
        if (!rel) return null;
        const s = getPos(rel.source);
        const t = getPos(rel.target);
        const x = s.x + (t.x - s.x) * particle.progress;
        const y = s.y + (t.y - s.y) * particle.progress;
        const isActive = selectedEntityId ? (selectedEntityId === rel.source || selectedEntityId === rel.target) : true;
        if (!isActive && selectedEntityId) return null;
        return (
          <circle
            key={particle.id}
            cx={x}
            cy={y}
            r={2.5}
            fill={particle.color}
            opacity={isActive ? 0.8 : 0.3}
            filter="url(#particle-glow)"
          />
        );
      })}

      {/* Nodes */}
      {visibleEntities.map(entity => {
        const pos = getPos(entity.id);
        const isSelected = entity.id === selectedEntityId;
        const isHov = entity.id === hoveredEntityId;
        const connected = isConnected(entity.id);
        const color = statusColorMap[entity.status];
        const nodeRadius = isSelected ? 22 : isHov ? 20 : 16;

        return (
          <g
            key={entity.id}
            onClick={() => onEntitySelect(entity.id)}
            onMouseEnter={() => onEntityHover(entity.id)}
            onMouseLeave={() => onEntityHover(null)}
            className="cursor-pointer"
            opacity={connected ? 1 : 0.25}
          >
            {/* Outer glow */}
            {(isSelected || entity.status === 'critical') && (
              <circle cx={pos.x} cy={pos.y} r={nodeRadius + 8} fill={color} opacity={0.1}
                className={entity.status === 'critical' ? 'animate-node-pulse' : ''} />
            )}
            {/* Background ring */}
            <circle cx={pos.x} cy={pos.y} r={nodeRadius + 2} fill="none" stroke={color}
              strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.5 : 0.2} />
            {/* Main circle */}
            <circle cx={pos.x} cy={pos.y} r={nodeRadius} fill="hsl(220, 18%, 7%)"
              stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
            {/* Icon */}
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central"
              fontSize={isSelected ? 14 : 12}>
              {entityTypeConfig[entity.type].icon}
            </text>
            {/* Label */}
            <text x={pos.x} y={pos.y + nodeRadius + 14} textAnchor="middle"
              fill="hsl(210, 20%, 75%)" fontSize="10" fontFamily="'Space Grotesk', sans-serif" fontWeight="500">
              {entity.name.length > 20 ? entity.name.slice(0, 18) + '…' : entity.name}
            </text>
            {/* Status dot */}
            <circle cx={pos.x + nodeRadius - 2} cy={pos.y - nodeRadius + 2} r={4} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
