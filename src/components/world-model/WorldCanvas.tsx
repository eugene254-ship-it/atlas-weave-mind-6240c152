import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { relationships, nodePositions, entityTypeConfig, type WorldEntity } from '@/data/worldModelData';
import { ZoomIn, ZoomOut, Maximize2, Locate } from 'lucide-react';

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
  entities?: WorldEntity[];
}

const statusColorMap: Record<string, string> = {
  stable: 'hsl(155, 65%, 45%)',
  stressed: 'hsl(35, 90%, 55%)',
  critical: 'hsl(0, 72%, 55%)',
  recovering: 'hsl(200, 70%, 55%)',
  uncertain: 'hsl(270, 40%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
};

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

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;

export function WorldCanvas({ width, height, selectedEntityId, onEntitySelect, activeLayers, hoveredEntityId, onEntityHover, showFlowParticles = true, customRelationships = [], entities }: Props) {
  const pad = 60;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const visibleEntities = useMemo(() =>
    entities ? entities.filter(e => activeLayers.includes(e.type)) : [],
    [activeLayers, entities]
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

  useEffect(() => {
    if (!showFlowParticles) { setParticles([]); return; }
    const initial: Particle[] = [];
    visibleRelationships.forEach((rel) => {
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
      setParticles(prev => prev.map(p => ({ ...p, progress: (p.progress + p.speed) % 1 })));
    }, 30);
    return () => clearInterval(interval);
  }, [showFlowParticles, visibleRelationships]);

  // Pan / zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const scale = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTransform(prev => {
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.k * scale));
      const realScale = nextK / prev.k;
      return {
        k: nextK,
        x: cx - (cx - prev.x) * realScale,
        y: cy - (cy - prev.y) * realScale,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-node="true"]')) return;
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setTransform(prev => ({ ...prev, x: panStartRef.current.tx + dx, y: panStartRef.current.ty + dy }));
  }, []);

  const endPan = useCallback(() => { isPanningRef.current = false; }, []);

  const zoomBy = useCallback((factor: number) => {
    setTransform(prev => {
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.k * factor));
      const realScale = nextK / prev.k;
      const cx = width / 2;
      const cy = height / 2;
      return {
        k: nextK,
        x: cx - (cx - prev.x) * realScale,
        y: cy - (cy - prev.y) * realScale,
      };
    });
  }, [width, height]);

  const resetView = useCallback(() => setTransform({ x: 0, y: 0, k: 1 }), []);

  const focusSelected = useCallback(() => {
    if (!selectedEntityId) { resetView(); return; }
    const p = getPos(selectedEntityId);
    const k = 1.6;
    setTransform({ k, x: width / 2 - p.x * k, y: height / 2 - p.y * k });
  }, [selectedEntityId, getPos, width, height, resetView]);

  // Tooltip tracking
  useEffect(() => {
    if (!hoveredEntityId) { setTooltipPos(null); return; }
    const p = getPos(hoveredEntityId);
    setTooltipPos({ x: p.x * transform.k + transform.x, y: p.y * transform.k + transform.y });
  }, [hoveredEntityId, transform, getPos]);

  const hoveredEntity = hoveredEntityId ? visibleEntities.find(e => e.id === hoveredEntityId) : null;
  const hoveredConnCount = hoveredEntityId
    ? relationships.filter(r => r.source === hoveredEntityId || r.target === hoveredEntityId).length
    : 0;

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ cursor: isPanningRef.current ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="particle-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(175, 70%, 50%)" opacity="0.4" />
          </marker>
          <marker id="arrowhead-custom" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(270, 60%, 60%)" opacity="0.6" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
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
              <circle key={particle.id} cx={x} cy={y} r={2.5} fill={particle.color}
                opacity={isActive ? 0.8 : 0.3} filter="url(#particle-glow)" />
            );
          })}

          {/* Custom Relationship Edges */}
          {customRelationships.filter(r => visibleIds.has(r.source) && visibleIds.has(r.target)).map(r => {
            const s = getPos(r.source);
            const t = getPos(r.target);
            const isActive = selectedEntityId === r.source || selectedEntityId === r.target;
            return (
              <g key={r.id}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(270, 60%, 60%)"
                  strokeWidth={isActive ? 2.5 : 1.5} strokeOpacity={isActive ? 0.8 : 0.5}
                  strokeDasharray="6,3" markerEnd="url(#arrowhead-custom)" />
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(270, 60%, 60%)"
                  strokeWidth={4} strokeOpacity={0.1} />
                <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6} textAnchor="middle"
                  fill="hsl(270, 60%, 70%)" fontSize="8" fontFamily="'Space Grotesk', sans-serif"
                  opacity={isActive ? 1 : 0.6}>{r.type}</text>
              </g>
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
                data-node="true"
                onClick={(e) => { e.stopPropagation(); onEntitySelect(entity.id); }}
                onMouseEnter={() => onEntityHover(entity.id)}
                onMouseLeave={() => onEntityHover(null)}
                className="cursor-pointer"
                opacity={connected ? 1 : 0.25}
              >
                {(isSelected || entity.status === 'critical') && (
                  <circle cx={pos.x} cy={pos.y} r={nodeRadius + 8} fill={color} opacity={0.1}
                    className={entity.status === 'critical' ? 'animate-node-pulse' : ''} />
                )}
                <circle cx={pos.x} cy={pos.y} r={nodeRadius + 2} fill="none" stroke={color}
                  strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.5 : 0.2} />
                <circle cx={pos.x} cy={pos.y} r={nodeRadius} fill="hsl(220, 18%, 7%)"
                  stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={isSelected ? 14 : 12}>{entityTypeConfig[entity.type].icon}</text>
                <text x={pos.x} y={pos.y + nodeRadius + 14} textAnchor="middle"
                  fill="hsl(210, 20%, 75%)" fontSize="10" fontFamily="'Space Grotesk', sans-serif" fontWeight="500">
                  {entity.name.length > 20 ? entity.name.slice(0, 18) + '…' : entity.name}
                </text>
                <circle cx={pos.x + nodeRadius - 2} cy={pos.y - nodeRadius + 2} r={4} fill={color} />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom / Pan HUD */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col gap-1 rounded-lg border border-border/50 bg-background/85 p-1 backdrop-blur-md">
        <button onClick={() => zoomBy(1.25)} title="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => zoomBy(1 / 1.25)} title="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={focusSelected} title={selectedEntityId ? 'Focus selected' : 'Center'}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
          disabled={!selectedEntityId}>
          <Locate className="h-3.5 w-3.5" />
        </button>
        <button onClick={resetView} title="Reset view"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div className="mt-0.5 border-t border-border/40 pt-1 text-center font-mono text-[8px] text-muted-foreground">
          {Math.round(transform.k * 100)}%
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredEntity && tooltipPos && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 12, transform: `translate(-50%, -100%)` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{entityTypeConfig[hoveredEntity.type].icon}</span>
              <span className="font-display text-xs font-semibold text-foreground">{hoveredEntity.name}</span>
            </div>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider"
              style={{ backgroundColor: `${statusColorMap[hoveredEntity.status]}22`, color: statusColorMap[hoveredEntity.status] }}
            >
              {hoveredEntity.status}
            </span>
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {hoveredEntity.type} · confidence {hoveredEntity.confidence} · {hoveredConnCount} links
          </div>
          {hoveredEntity.metrics.slice(0, 3).length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
              {hoveredEntity.metrics.slice(0, 3).map((m, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] text-muted-foreground">{m.label}</span>
                  <span className="font-mono text-[10px] text-foreground">
                    {m.value} <span className="text-muted-foreground">
                      {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
