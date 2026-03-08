import { entityTypeConfig, type EntityType } from '@/data/worldModelData';
import { cn } from '@/lib/utils';

interface Props {
  activeLayers: string[];
  onToggle: (layer: string) => void;
}

const layers: EntityType[] = ['ecosystem', 'infrastructure', 'institution', 'community', 'economic', 'health'];

export function LayerToggle({ activeLayers, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {layers.map(layer => {
        const config = entityTypeConfig[layer];
        const active = activeLayers.includes(layer);
        return (
          <button
            key={layer}
            onClick={() => onToggle(layer)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all',
              active
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-border'
            )}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
