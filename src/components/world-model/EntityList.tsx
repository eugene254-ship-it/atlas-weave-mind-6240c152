import { useState, useMemo } from 'react';
import { entities, type EntityType } from '@/data/worldModelData';
import { EntityCard } from './EntityCard';
import { Search } from 'lucide-react';

interface Props {
  selectedEntityId: string | null;
  onEntitySelect: (id: string) => void;
  activeLayers: string[];
}

export function EntityList({ selectedEntityId, onEntitySelect, activeLayers }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    entities.filter(e =>
      activeLayers.includes(e.type) &&
      (search === '' || e.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [activeLayers, search]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="relative p-3">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search entities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border/50 bg-muted/30 py-2 pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 pt-0">
        {filtered.map(entity => (
          <EntityCard
            key={entity.id}
            entity={entity}
            isSelected={entity.id === selectedEntityId}
            onClick={() => onEntitySelect(entity.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center font-mono text-xs text-muted-foreground">No entities match filters</div>
        )}
      </div>
    </div>
  );
}
