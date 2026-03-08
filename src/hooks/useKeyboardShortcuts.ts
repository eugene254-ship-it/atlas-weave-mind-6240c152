import { useEffect, useCallback } from 'react';
import type { WorldEntity } from '@/data/worldModelData';

type ViewMode = 'canvas' | 'list' | 'geo';

interface Options {
  entities: WorldEntity[];
  activeLayers: string[];
  selectedEntityId: string | null;
  onEntitySelect: (id: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSearch: () => void;
}

export function useKeyboardShortcuts({
  entities,
  activeLayers,
  selectedEntityId,
  onEntitySelect,
  viewMode,
  onViewModeChange,
  onToggleSearch,
}: Options) {
  const visibleEntities = entities.filter(e => activeLayers.includes(e.type));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Escape: deselect
    if (e.key === 'Escape') {
      e.preventDefault();
      onEntitySelect(null);
      return;
    }

    // Arrow keys: navigate entities
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (visibleEntities.length === 0) return;

      const currentIdx = selectedEntityId
        ? visibleEntities.findIndex(ent => ent.id === selectedEntityId)
        : -1;

      let nextIdx: number;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIdx = currentIdx < visibleEntities.length - 1 ? currentIdx + 1 : 0;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : visibleEntities.length - 1;
      }

      onEntitySelect(visibleEntities[nextIdx].id);
      return;
    }

    // Number keys: switch views
    if (e.key === '1') { e.preventDefault(); onViewModeChange('canvas'); return; }
    if (e.key === '2') { e.preventDefault(); onViewModeChange('geo'); return; }
    if (e.key === '3') { e.preventDefault(); onViewModeChange('list'); return; }

    // Cmd/Ctrl+K: search (handled by CrossSystemSearch but also trigger here)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      // Let the existing handler in CrossSystemSearch handle this
      return;
    }
  }, [visibleEntities, selectedEntityId, onEntitySelect, onViewModeChange, onToggleSearch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
