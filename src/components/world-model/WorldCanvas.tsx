import { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { relationships, nodePositions, entityTypeConfig, type WorldEntity } from '@/data/worldModelData';
import { ZoomIn, ZoomOut, Maximize2, Locate, Pin, Keyboard } from 'lucide-react';

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
const VIRTUAL_MARGIN = 80; // screen-px margin around viewport for culling

export function WorldCanvas({ width, height, selectedEntityId, onEntitySelect, activeLayers, hoveredEntityId, onEntityHover, showFlowParticles = true, customRelationships = [], entities }: Props) {
  const pad = 60;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const [particles, setParticles] = useState<Particle[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipMode, setTooltipMode] = useState<'hover' | 'pinned'>('hover');
  const [pinnedEntityId, setPinnedEntityId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  // ---- Viewport-based virtualization ----
  const worldViewport = useMemo(() => {
    const margin = VIRTUAL_MARGIN / transform.k;
    return {
      x: -transform.x / transform.k - margin,
      y: -transform.y / transform.k - margin,
      x2: (-transform.x + width) / transform.k + margin,
      y2: (-transform.y + height) / transform.k + margin,
    };
  }, [transform, width, height]);

  const inView = useCallback((p: { x: number; y: number }) =>
    p.x >= worldViewport.x && p.x <= worldViewport.x2 &&
    p.y >= worldViewport.y && p.y <= worldViewport.y2,
    [worldViewport]
  );

  const culledEntities = useMemo(() =>
    visibleEntities.filter(e => inView(getPos(e.id))),
    [visibleEntities, inView, getPos]
  );

  const culledRelationships = useMemo(() =>
    visibleRelationships.filter(r => inView(getPos(r.source)) || inView(getPos(r.target))),
    [visibleRelationships, inView, getPos]
  );

  const culledRelIds = useMemo(() => new Set(culledRelationships.map(r => r.id)), [culledRelationships]);

  // Always render the selected node + its immediate neighbours so the focused
  // context never disappears even when scrolled off screen.
  const forcedIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedEntityId) {
      ids.add(selectedEntityId);
      relationships.forEach(r => {
        if (r.source === selectedEntityId) ids.add(r.target);
        if (r.target === selectedEntityId) ids.add(r.source);
      });
    }
    if (pinnedEntityId) ids.add(pinnedEntityId);
    return ids;
  }, [selectedEntityId, pinnedEntityId]);

  const renderEntities = useMemo(() => {
    const set = new Set(culledEntities.map(e => e.id));
    const extras = visibleEntities.filter(e => !set.has(e.id) && forcedIds.has(e.id));
    return [...culledEntities, ...extras];
  }, [culledEntities, visibleEntities, forcedIds]);

  // Particle animation (only for culled rels)
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

  // ---- Pan / zoom handlers ----
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

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    const ax = cx ?? width / 2;
    const ay = cy ?? height / 2;
    setTransform(prev => {
      const nextK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.k * factor));
      const realScale = nextK / prev.k;
      return {
        k: nextK,
        x: ax - (ax - prev.x) * realScale,
        y: ay - (ay - prev.y) * realScale,
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

  const panBy = useCallback((dx: number, dy: number) => {
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case '+': case '=':
          e.preventDefault(); zoomBy(1.25); break;
        case '-': case '_':
          e.preventDefault(); zoomBy(1 / 1.25); break;
        case '0':
          e.preventDefault(); resetView(); break;
        case 'f': case 'F':
          e.preventDefault(); focusSelected(); break;
        case 'p': case 'P':
          e.preventDefault();
          setTooltipMode(m => {
            const next = m === 'hover' ? 'pinned' : 'hover';
            if (next === 'hover') setPinnedEntityId(null);
            return next;
          });
          break;
        case '?':
          e.preventDefault(); setShowShortcuts(s => !s); break;
        case 'ArrowUp':    e.preventDefault(); panBy(0, 60); break;
        case 'ArrowDown':  e.preventDefault(); panBy(0, -60); break;
        case 'ArrowLeft':  e.preventDefault(); panBy(60, 0); break;
        case 'ArrowRight': e.preventDefault(); panBy(-60, 0); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomBy, resetView, focusSelected, panBy]);

  // ---- Tooltip tracking ----
  const tooltipEntityId = tooltipMode === 'pinned' ? pinnedEntityId : hoveredEntityId;
  useEffect(() => {
    if (!tooltipEntityId) { setTooltipPos(null); return; }
    const p = getPos(tooltipEntityId);
    setTooltipPos({ x: p.x * transform.k + transform.x, y: p.y * transform.k + transform.y });
  }, [tooltipEntityId, transform, getPos]);

  const tooltipEntity = tooltipEntityId ? visibleEntities.find(e => e.id === tooltipEntityId) : null;
  const tooltipConnCount = tooltipEntityId
    ? relationships.filter(r => r.source === tooltipEntityId || r.target === tooltipEntityId).length
    : 0;

  const handleNodeClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tooltipMode === 'pinned') {
      setPinnedEntityId(prev => prev === id ? null : id);
    }
    onEntitySelect(id);
  }, [tooltipMode, onEntitySelect]);

  // ---- Minimap geometry ----
  const miniW = 180;
  const miniH = 120;
  const miniScaleX = miniW / width;
  const miniScaleY = miniH / height;
  const vpRect = {
    x: (-transform.x / transform.k) * miniScaleX,
    y: (-transform.y / transform.k) * miniScaleY,
    w: (width / transform.k) * miniScaleX,
    h: (height / transform.k) * miniScaleY,
  };
  const miniDragRef = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({ dragging: false, offsetX: 0, offsetY: 0 });
  const miniSvgRef = useRef<SVGSVGElement>(null);

  const centerOnWorldPoint = useCallback((wx: number, wy: number) => {
    setTransform(prev => ({ k: prev.k, x: width / 2 - wx * prev.k, y: height / 2 - wy * prev.k }));
  }, [width, height]);

  const miniPointToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = miniSvgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    return { x: mx / miniScaleX, y: my / miniScaleY };
  }, [miniScaleX, miniScaleY]);

  const handleMiniDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const pt = miniPointToWorld(e.clientX, e.clientY);
    if (!pt) return;
    miniDragRef.current = { dragging: true, offsetX: 0, offsetY: 0 };
    centerOnWorldPoint(pt.x, pt.y);
  }, [centerOnWorldPoint, miniPointToWorld]);

  const handleMiniMove = useCallback((e: React.MouseEvent) => {
    if (!miniDragRef.current.dragging) return;
    const pt = miniPointToWorld(e.clientX, e.clientY);
    if (!pt) return;
    centerOnWorldPoint(pt.x, pt.y);
  }, [centerOnWorldPoint, miniPointToWorld]);

  const endMiniDrag = useCallback(() => { miniDragRef.current.dragging = false; }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
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
          {culledRelationships.map(r => {
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
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(175, 70%, 50%)"
                    strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4,4" className="animate-flow" />
                )}
              </g>
            );
          })}

          {/* Flow Particles (only on visible edges) */}
          {showFlowParticles && particles.map(particle => {
            if (!culledRelIds.has(particle.relId)) return null;
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

          {/* Custom Relationship Edges (also virtualized) */}
          {customRelationships
            .filter(r => visibleIds.has(r.source) && visibleIds.has(r.target))
            .filter(r => inView(getPos(r.source)) || inView(getPos(r.target)))
            .map(r => {
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
          {renderEntities.map(entity => {
            const pos = getPos(entity.id);
            const isSelected = entity.id === selectedEntityId;
            const isHov = entity.id === hoveredEntityId;
            const isPinned = entity.id === pinnedEntityId;
            const connected = isConnected(entity.id);
            const color = statusColorMap[entity.status];
            const nodeRadius = isSelected ? 22 : isHov ? 20 : 16;
            return (
              <g
                key={entity.id}
                data-node="true"
                onClick={(e) => handleNodeClick(entity.id, e)}
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
                {isPinned && (
                  <circle cx={pos.x - nodeRadius + 2} cy={pos.y - nodeRadius + 2} r={4}
                    fill="hsl(45, 90%, 60%)" stroke="hsl(220, 18%, 7%)" strokeWidth={1} />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom / Pan HUD */}
      <div className="pointer-events-auto absolute bottom-14 right-4 flex flex-col gap-1 rounded-lg border border-border/50 bg-background/85 p-1 backdrop-blur-md">
        <button onClick={() => zoomBy(1.25)} title="Zoom in (+)"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => zoomBy(1 / 1.25)} title="Zoom out (-)"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={focusSelected} title={selectedEntityId ? 'Focus selected (F)' : 'Center (F)'}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-40"
          disabled={!selectedEntityId}>
          <Locate className="h-3.5 w-3.5" />
        </button>
        <button onClick={resetView} title="Reset view (0)"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            setTooltipMode(m => {
              const next = m === 'hover' ? 'pinned' : 'hover';
              if (next === 'hover') setPinnedEntityId(null);
              return next;
            });
          }}
          title={tooltipMode === 'pinned' ? 'Tooltip: Pinned (P)' : 'Tooltip: Hover (P)'}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted/40 ${
            tooltipMode === 'pinned' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setShowShortcuts(s => !s)} title="Keyboard shortcuts (?)"
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-muted/40 ${
            showShortcuts ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Keyboard className="h-3.5 w-3.5" />
        </button>
        <div className="mt-0.5 border-t border-border/40 pt-1 text-center font-mono text-[8px] text-muted-foreground">
          {Math.round(transform.k * 100)}%
        </div>
      </div>

      {/* Minimap */}
      <div className="pointer-events-auto absolute bottom-14 left-4 rounded-lg border border-border/50 bg-background/85 p-1.5 backdrop-blur-md">
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">Minimap</span>
          <span className="font-mono text-[8px] text-muted-foreground">{renderEntities.length}/{visibleEntities.length}</span>
        </div>
        <svg
          ref={miniSvgRef}
          width={miniW}
          height={miniH}
          className="cursor-crosshair rounded bg-muted/20"
          onMouseDown={handleMiniDown}
          onMouseMove={handleMiniMove}
          onMouseUp={endMiniDrag}
          onMouseLeave={endMiniDrag}
        >
          {/* Edges (faint) */}
          {visibleRelationships.map(r => {
            const s = getPos(r.source);
            const t = getPos(r.target);
            return (
              <line key={r.id}
                x1={s.x * miniScaleX} y1={s.y * miniScaleY}
                x2={t.x * miniScaleX} y2={t.y * miniScaleY}
                stroke="hsl(220, 15%, 30%)" strokeWidth={0.5} strokeOpacity={0.4} />
            );
          })}
          {/* Nodes */}
          {visibleEntities.map(e => {
            const p = getPos(e.id);
            const color = statusColorMap[e.status];
            const isSel = e.id === selectedEntityId;
            return (
              <circle key={e.id}
                cx={p.x * miniScaleX} cy={p.y * miniScaleY}
                r={isSel ? 2.5 : 1.5}
                fill={color} opacity={isSel ? 1 : 0.75} />
            );
          })}
          {/* Viewport rect */}
          <rect
            x={Math.max(0, vpRect.x)}
            y={Math.max(0, vpRect.y)}
            width={Math.min(miniW, vpRect.w)}
            height={Math.min(miniH, vpRect.h)}
            fill="hsl(175, 70%, 50%)"
            fillOpacity={0.1}
            stroke="hsl(175, 70%, 60%)"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Hover / pinned tooltip */}
      {tooltipEntity && tooltipPos && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 12, transform: `translate(-50%, -100%)` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{entityTypeConfig[tooltipEntity.type].icon}</span>
              <span className="font-display text-xs font-semibold text-foreground">{tooltipEntity.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {tooltipMode === 'pinned' && pinnedEntityId === tooltipEntity.id && (
                <Pin className="h-3 w-3 text-primary" />
              )}
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                style={{ backgroundColor: `${statusColorMap[tooltipEntity.status]}22`, color: statusColorMap[tooltipEntity.status] }}
              >
                {tooltipEntity.status}
              </span>
            </div>
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {tooltipEntity.type} · confidence {tooltipEntity.confidence} · {tooltipConnCount} links
          </div>
          {tooltipEntity.metrics.slice(0, 3).length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
              {tooltipEntity.metrics.slice(0, 3).map((m, i) => (
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

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <div className="pointer-events-auto absolute right-16 bottom-14 w-64 rounded-lg border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Shortcuts</span>
            <button onClick={() => setShowShortcuts(false)} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">esc</button>
          </div>
          <div className="space-y-1 font-mono text-[10px]">
            {[
              ['+ / =', 'Zoom in'],
              ['− / _', 'Zoom out'],
              ['0', 'Reset view'],
              ['F', 'Focus selected'],
              ['← ↑ → ↓', 'Pan'],
              ['P', 'Toggle pinned tooltip'],
              ['?', 'Toggle this help'],
              ['Drag', 'Pan canvas'],
              ['Wheel', 'Zoom at cursor'],
            ].map(([k, l]) => (
              <div key={k} className="flex items-center justify-between text-muted-foreground">
                <span className="text-foreground">{k}</span><span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
