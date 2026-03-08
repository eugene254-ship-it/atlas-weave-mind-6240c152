import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { type WorldEntity, entities, relationships, entityTypeConfig, type EntityStatus } from '@/data/worldModelData';
import { SystemStateBadge } from './SystemStateBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
  liveEntities?: WorldEntity[];
}

interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  entity: WorldEntity;
  depth: number; // 0 = selected, positive = downstream, negative = upstream
}

const statusColors: Record<EntityStatus, string> = {
  stable: 'hsl(155, 65%, 45%)',
  stressed: 'hsl(35, 90%, 55%)',
  critical: 'hsl(0, 72%, 55%)',
  recovering: 'hsl(200, 70%, 55%)',
  uncertain: 'hsl(270, 40%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
};

function buildChain(entityId: string, allEntities: WorldEntity[]) {
  const upstream: { entity: WorldEntity; depth: number }[] = [];
  const downstream: { entity: WorldEntity; depth: number }[] = [];
  const selected = allEntities.find(e => e.id === entityId);
  if (!selected) return { upstream, downstream, selected: null };

  // BFS upstream
  const visitedUp = new Set([entityId]);
  let queue = selected.dependencies.filter(id => !visitedUp.has(id));
  let depth = 1;
  while (queue.length > 0 && depth <= 4) {
    const next: string[] = [];
    for (const id of queue) {
      if (visitedUp.has(id)) continue;
      visitedUp.add(id);
      const e = allEntities.find(en => en.id === id);
      if (e) {
        upstream.push({ entity: e, depth });
        e.dependencies.forEach(d => { if (!visitedUp.has(d)) next.push(d); });
      }
    }
    queue = next;
    depth++;
  }

  // BFS downstream
  const visitedDown = new Set([entityId]);
  queue = selected.dependents.filter(id => !visitedDown.has(id));
  depth = 1;
  while (queue.length > 0 && depth <= 4) {
    const next: string[] = [];
    for (const id of queue) {
      if (visitedDown.has(id)) continue;
      visitedDown.add(id);
      const e = allEntities.find(en => en.id === id);
      if (e) {
        downstream.push({ entity: e, depth });
        e.dependents.forEach(d => { if (!visitedDown.has(d)) next.push(d); });
      }
    }
    queue = next;
    depth++;
  }

  return { upstream, downstream, selected };
}

export function DependencyGraph({ isOpen, onClose, selectedEntityId, onEntitySelect, liveEntities }: Props) {
  const allEntities = liveEntities || entities;
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<ForceNode[]>([]);
  const animRef = useRef<number>();

  const chain = useMemo(() => {
    if (!selectedEntityId) return null;
    return buildChain(selectedEntityId, allEntities);
  }, [selectedEntityId, allEntities]);

  // Initialize force layout
  useEffect(() => {
    if (!chain || !chain.selected || !isOpen) return;

    const width = 800;
    const height = 500;
    const cx = width / 2;
    const cy = height / 2;

    const forceNodes: ForceNode[] = [];

    // Selected node at center
    forceNodes.push({
      id: chain.selected.id,
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      entity: chain.selected,
      depth: 0,
    });

    // Upstream (left)
    chain.upstream.forEach((u, i) => {
      const angle = ((i / Math.max(chain.upstream.length, 1)) * Math.PI) - Math.PI / 2;
      forceNodes.push({
        id: u.entity.id,
        x: cx - u.depth * 160 + Math.cos(angle) * 40,
        y: cy + Math.sin(angle) * (80 + i * 30),
        vx: 0,
        vy: 0,
        entity: u.entity,
        depth: -u.depth,
      });
    });

    // Downstream (right)
    chain.downstream.forEach((d, i) => {
      const angle = ((i / Math.max(chain.downstream.length, 1)) * Math.PI) - Math.PI / 2;
      forceNodes.push({
        id: d.entity.id,
        x: cx + d.depth * 160 + Math.cos(angle) * 40,
        y: cy + Math.sin(angle) * (80 + i * 30),
        vx: 0,
        vy: 0,
        entity: d.entity,
        depth: d.depth,
      });
    });

    setNodes(forceNodes);

    // Simple force simulation
    let frame = 0;
    const maxFrames = 120;
    const simulate = () => {
      if (frame >= maxFrames) return;
      frame++;

      setNodes(prev => {
        const updated = prev.map(n => ({ ...n }));
        const k = 0.02;
        const repulsion = 5000;

        // Repulsion between all nodes
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const dx = updated[j].x - updated[i].x;
            const dy = updated[j].y - updated[i].y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const f = repulsion / (dist * dist);
            const fx = (dx / dist) * f;
            const fy = (dy / dist) * f;
            updated[i].vx -= fx;
            updated[i].vy -= fy;
            updated[j].vx += fx;
            updated[j].vy += fy;
          }
        }

        // Attract connected nodes
        const allIds = new Set(updated.map(n => n.id));
        relationships.filter(r => allIds.has(r.source) && allIds.has(r.target)).forEach(r => {
          const a = updated.find(n => n.id === r.source)!;
          const b = updated.find(n => n.id === r.target)!;
          if (!a || !b) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const targetDist = 180;
          const f = (dist - targetDist) * k;
          const fx = (dx / Math.max(dist, 1)) * f;
          const fy = (dy / Math.max(dist, 1)) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        });

        // Horizontal layering force
        updated.forEach(n => {
          const targetX = 400 + n.depth * 160;
          n.vx += (targetX - n.x) * 0.03;
        });

        // Center gravity
        updated.forEach(n => {
          n.vx += (400 - n.x) * 0.001;
          n.vy += (250 - n.y) * 0.003;
        });

        // Apply velocity with damping
        const damping = 0.85;
        updated.forEach(n => {
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
          // Bounds
          n.x = Math.max(60, Math.min(740, n.x));
          n.y = Math.max(50, Math.min(450, n.y));
        });

        return updated;
      });

      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [chain, isOpen]);

  if (!isOpen || !selectedEntityId || !chain?.selected) return null;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = relationships.filter(r => nodeIds.has(r.source) && nodeIds.has(r.target));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-border/50 bg-card shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Dependency Graph</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {chain.selected.name} · {chain.upstream.length} upstream · {chain.downstream.length} downstream
                </span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 border-b border-border/20 px-5 py-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">← Upstream (Dependencies)</span>
            <div className="flex-1" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Selected</span>
            <div className="flex-1" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Downstream (Dependents) →</span>
          </div>

          {/* SVG Canvas */}
          <svg ref={svgRef} width={800} height={500} className="w-full" viewBox="0 0 800 500">
            <defs>
              <marker id="dep-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(175, 70%, 50%)" opacity="0.5" />
              </marker>
              <filter id="dep-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Edges */}
            {edges.map(edge => {
              const s = nodeMap.get(edge.source);
              const t = nodeMap.get(edge.target);
              if (!s || !t) return null;
              return (
                <line
                  key={edge.id}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="hsl(175, 70%, 50%)"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  markerEnd="url(#dep-arrow)"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isCenter = node.depth === 0;
              const radius = isCenter ? 28 : 20;
              const color = statusColors[node.entity.status];
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => onEntitySelect(node.id)}
                >
                  {isCenter && (
                    <circle cx={node.x} cy={node.y} r={radius + 10} fill="hsl(175, 70%, 50%)" opacity={0.08} />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 3}
                    fill="none"
                    stroke={isCenter ? 'hsl(175, 70%, 50%)' : color}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill="hsl(220, 18%, 7%)"
                    stroke={color}
                    strokeWidth={isCenter ? 2.5 : 1.5}
                  />
                  <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={isCenter ? 16 : 13}>
                    {entityTypeConfig[node.entity.type].icon}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + radius + 14}
                    textAnchor="middle"
                    fill="hsl(210, 20%, 75%)"
                    fontSize="9"
                    fontFamily="'Space Grotesk', sans-serif"
                    fontWeight="500"
                  >
                    {node.entity.name.length > 18 ? node.entity.name.slice(0, 16) + '…' : node.entity.name}
                  </text>
                  {/* Status dot */}
                  <circle cx={node.x + radius - 3} cy={node.y - radius + 3} r={4} fill={color} />
                </g>
              );
            })}
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
