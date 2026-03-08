import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { entities, relationships, entityTypeConfig, type WorldEntity, type EntityStatus } from '@/data/worldModelData';

interface Props {
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
  activeLayers: string[];
  hoveredEntityId: string | null;
  onEntityHover: (id: string | null) => void;
}

const statusColors: Record<EntityStatus, string> = {
  stable: 'hsl(155, 65%, 45%)',
  stressed: 'hsl(35, 90%, 55%)',
  critical: 'hsl(0, 72%, 55%)',
  recovering: 'hsl(200, 70%, 55%)',
  uncertain: 'hsl(270, 40%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
};

// Real Kenya coordinates for each entity
const geoPositions: Record<string, [number, number]> = {
  'rainfall-east': [-0.5, 38.5],
  'forest-upper-tana': [-0.25, 37.3],
  'river-tana': [-0.8, 37.8],
  'dam-masinga': [-0.88, 37.58],
  'hydro-kindaruma': [-1.15, 37.63],
  'irrigation-mwea': [-0.73, 37.35],
  'water-nairobi': [-1.29, 36.82],
  'food-nairobi': [-1.3, 36.85],
  'health-nairobi': [-1.27, 36.88],
  'community-kibera': [-1.31, 36.79],
};

export function GeoMapLayer({ selectedEntityId, onEntitySelect, activeLayers, hoveredEntityId, onEntityHover }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [-0.8, 37.4],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update markers and lines
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear old
    Object.values(markersRef.current).forEach(m => m.remove());
    linesRef.current.forEach(l => l.remove());
    markersRef.current = {};
    linesRef.current = [];

    const visibleEntities = entities.filter(e => activeLayers.includes(e.type));
    const visibleIds = new Set(visibleEntities.map(e => e.id));

    // Draw relationship lines
    const visibleRels = relationships.filter(r => visibleIds.has(r.source) && visibleIds.has(r.target));
    visibleRels.forEach(rel => {
      const sPos = geoPositions[rel.source];
      const tPos = geoPositions[rel.target];
      if (!sPos || !tPos) return;

      const isActive = selectedEntityId === rel.source || selectedEntityId === rel.target;
      const line = L.polyline([sPos, tPos], {
        color: isActive ? 'hsl(175, 70%, 50%)' : 'hsl(220, 15%, 30%)',
        weight: isActive ? 2.5 : 1,
        opacity: isActive ? 0.7 : 0.2,
        dashArray: rel.confidence === 'low' ? '4 4' : rel.confidence === 'medium' ? '8 4' : undefined,
      }).addTo(map);
      linesRef.current.push(line);
    });

    // Draw entity markers
    visibleEntities.forEach(entity => {
      const pos = geoPositions[entity.id];
      if (!pos) return;

      const isSelected = entity.id === selectedEntityId;
      const isHovered = entity.id === hoveredEntityId;
      const color = statusColors[entity.status];
      const radius = isSelected ? 14 : isHovered ? 12 : 9;

      const marker = L.circleMarker(pos, {
        radius,
        fillColor: color,
        fillOpacity: isSelected ? 0.9 : 0.7,
        color: isSelected ? 'hsl(175, 70%, 50%)' : color,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 1 : 0.8,
      }).addTo(map);

      // Tooltip
      marker.bindTooltip(
        `<div style="font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;">${entityTypeConfig[entity.type].icon} ${entity.name}</div>
         <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;opacity:0.7;margin-top:2px;">${entity.status} · ${entity.confidence} confidence</div>`,
        {
          className: 'geo-tooltip',
          direction: 'top',
          offset: [0, -radius],
        }
      );

      marker.on('click', () => onEntitySelect(entity.id));
      marker.on('mouseover', () => onEntityHover(entity.id));
      marker.on('mouseout', () => onEntityHover(null));

      markersRef.current[entity.id] = marker;
    });
  }, [activeLayers, selectedEntityId, hoveredEntityId, onEntitySelect, onEntityHover]);

  return (
    <>
      <div ref={mapRef} className="absolute inset-0 z-0" />
      <style>{`
        .geo-tooltip {
          background: hsl(220, 18%, 7%) !important;
          border: 1px solid hsl(220, 15%, 20%) !important;
          border-radius: 8px !important;
          color: hsl(210, 20%, 88%) !important;
          padding: 8px 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .geo-tooltip::before {
          border-top-color: hsl(220, 15%, 20%) !important;
        }
        .leaflet-control-zoom a {
          background: hsl(220, 18%, 7%) !important;
          color: hsl(210, 20%, 88%) !important;
          border-color: hsl(220, 15%, 20%) !important;
        }
        .leaflet-control-zoom a:hover {
          background: hsl(220, 15%, 12%) !important;
        }
      `}</style>
    </>
  );
}
