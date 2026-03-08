import { useState } from 'react';
import { entityTypeConfig, relationships, type EntityType } from '@/data/worldModelData';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const entityTypes: { type: EntityType; description: string; examples: string[] }[] = [
  { type: 'ecosystem', description: 'Natural systems including watersheds, forests, biodiversity zones, and climate patterns.', examples: ['River basins', 'Forest reserves', 'Rainfall systems', 'Wetlands'] },
  { type: 'infrastructure', description: 'Built systems including dams, water supply, power stations, roads, and telecom networks.', examples: ['Dams', 'Water supply', 'Power stations', 'Transport corridors'] },
  { type: 'institution', description: 'Governance bodies including ministries, agencies, regulators, and international organizations.', examples: ['Ministries', 'County governments', 'Regulatory agencies'] },
  { type: 'community', description: 'Human settlement groups including urban neighborhoods, rural villages, and informal settlements.', examples: ['Informal settlements', 'Urban wards', 'Rural communities'] },
  { type: 'economic', description: 'Market and production systems including agriculture, trade, manufacturing, and financial flows.', examples: ['Irrigation schemes', 'Food markets', 'Supply chains', 'Financial institutions'] },
  { type: 'health', description: 'Health infrastructure and systems including hospitals, clinics, disease surveillance, and public health.', examples: ['County health systems', 'Hospitals', 'Disease surveillance'] },
];

const relationshipTypes = [
  { verb: 'supplies', description: 'Physical resource flow (water, energy, food)', examples: ['River → Dam', 'Dam → Irrigation'], color: 'text-status-recovering' },
  { verb: 'regulates', description: 'Governance or natural regulation of a system', examples: ['Forest → River flow', 'Ministry → Infrastructure'], color: 'text-status-uncertain' },
  { verb: 'depends on', description: 'Functional dependency requiring another system', examples: ['Irrigation → Dam', 'Community → Water supply'], color: 'text-status-stressed' },
  { verb: 'influences', description: 'Indirect effect propagation between systems', examples: ['Food prices → Community stress', 'Rainfall → All downstream'], color: 'text-primary' },
  { verb: 'feeds', description: 'Nutritional or sustenance flow to populations', examples: ['Markets → Communities', 'Agriculture → Markets'], color: 'text-status-stable' },
  { verb: 'serves', description: 'Service delivery relationship', examples: ['Health system → Community', 'Water utility → Residents'], color: 'text-status-recovering' },
  { verb: 'damages / degrades', description: 'Harmful causal link reducing system health', examples: ['Deforestation → Erosion', 'Pollution → Water quality'], color: 'text-status-critical' },
  { verb: 'restores', description: 'Intervention or natural recovery improving a system', examples: ['Reforestation → Forest', 'Infrastructure repair → Supply'], color: 'text-status-stable' },
];

const ontologyProperties = [
  { name: 'Identity', description: 'Name, type, canonical ID, spatial reference' },
  { name: 'Condition', description: 'Current status, health index, operational state' },
  { name: 'Relationships', description: 'Upstream dependencies, downstream influences, governance links' },
  { name: 'Temporality', description: 'Historical states, change trajectory, event log' },
  { name: 'Uncertainty', description: 'Data confidence, model reliability, evidence quality' },
  { name: 'Flows', description: 'Resource throughput — water, energy, food, capital, people' },
];

export function OntologyBrowser({ isOpen, onClose }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('entities');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const uniqueRelTypes = [...new Set(relationships.map(r => r.type))];

  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);
  const toggleItem = (s: string) => setExpandedItem(prev => prev === s ? null : s);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-y-0 left-0 z-40 flex w-[380px] flex-col border-r border-border/50 bg-card/95 backdrop-blur-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-display text-sm font-semibold text-foreground">Ontology Browser</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Atlas Knowledge Schema</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Entity Types Section */}
            <div className="border-b border-border/30">
              <button onClick={() => toggleSection('entities')} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Entity Classes</span>
                {expandedSection === 'entities' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {expandedSection === 'entities' && (
                <div className="space-y-1 px-3 pb-3">
                  {entityTypes.map(et => {
                    const config = entityTypeConfig[et.type];
                    const isExpanded = expandedItem === et.type;
                    return (
                      <div key={et.type} className="rounded-lg border border-border/30 bg-muted/20">
                        <button onClick={() => toggleItem(et.type)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
                          <span className="text-sm">{config.icon}</span>
                          <span className="flex-1 font-display text-xs font-medium text-foreground">{config.label}</span>
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                        </button>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden border-t border-border/20 px-3 py-2">
                            <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">{et.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {et.examples.map(ex => (
                                <span key={ex} className="rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 font-mono text-[9px] text-foreground/60">{ex}</span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Relationship Types */}
            <div className="border-b border-border/30">
              <button onClick={() => toggleSection('relationships')} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Relationship Taxonomy</span>
                {expandedSection === 'relationships' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {expandedSection === 'relationships' && (
                <div className="space-y-1 px-3 pb-3">
                  {relationshipTypes.map(rt => (
                    <div key={rt.verb} className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-mono text-xs font-semibold', rt.color)}>{rt.verb}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{rt.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {rt.examples.map(ex => (
                          <span key={ex} className="font-mono text-[9px] text-foreground/40">{ex}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Entity Properties (Universal Grammar) */}
            <div className="border-b border-border/30">
              <button onClick={() => toggleSection('properties')} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Universal Entity Grammar</span>
                {expandedSection === 'properties' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {expandedSection === 'properties' && (
                <div className="space-y-1.5 px-3 pb-3">
                  {ontologyProperties.map((p, i) => (
                    <div key={p.name} className="flex items-start gap-3 rounded-md bg-muted/20 px-3 py-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 font-mono text-[9px] text-primary">{i + 1}</span>
                      <div>
                        <span className="font-display text-xs font-medium text-foreground">{p.name}</span>
                        <p className="text-[10px] text-muted-foreground">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Relationships in System */}
            <div>
              <button onClick={() => toggleSection('active')} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Active Relationships ({relationships.length})</span>
                {expandedSection === 'active' ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {expandedSection === 'active' && (
                <div className="space-y-0.5 px-3 pb-3">
                  {uniqueRelTypes.map(type => {
                    const count = relationships.filter(r => r.type === type).length;
                    return (
                      <div key={type} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5">
                        <span className="font-mono text-[11px] text-foreground/70">{type}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] text-primary">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
