import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Beaker, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SystemStateBadge, ConfidenceIndicator } from './SystemStateBadge';
import type { EntityStatus, ConfidenceLevel } from '@/data/worldModelData';

interface Scenario {
  id: string;
  name: string;
  description: string;
  intervention: string;
  cost: string;
  timeframe: string;
  outcomes: {
    entity: string;
    metric: string;
    baseline: string;
    projected: string;
    trend: 'up' | 'down' | 'stable';
    confidence: ConfidenceLevel;
  }[];
  systemImpact: {
    label: string;
    before: EntityStatus;
    after: EntityStatus;
  }[];
}

const scenarios: Scenario[] = [
  {
    id: 'reforestation',
    name: 'Upper Tana Reforestation',
    description: 'Accelerated reforestation programme targeting 5,000 ha in the upper Tana watershed over 3 years.',
    intervention: 'Tree planting + community forest guards + charcoal alternatives',
    cost: '$12M over 3 years',
    timeframe: '2026–2029',
    outcomes: [
      { entity: 'Upper Tana Forest', metric: 'Forest Cover', baseline: '62%', projected: '74%', trend: 'up', confidence: 'medium' },
      { entity: 'Tana River Basin', metric: 'Sediment Load', baseline: '12.4 mg/L', projected: '8.1 mg/L', trend: 'down', confidence: 'medium' },
      { entity: 'Masinga Dam', metric: 'Siltation Rate', baseline: '2.1M m³/yr', projected: '1.4M m³/yr', trend: 'down', confidence: 'low' },
      { entity: 'Tana River Basin', metric: 'Flow Stability', baseline: 'Stressed', projected: 'Recovering', trend: 'up', confidence: 'medium' },
    ],
    systemImpact: [
      { label: 'Upper Tana Forest', before: 'degraded', after: 'recovering' },
      { label: 'Tana River Basin', before: 'stressed', after: 'recovering' },
      { label: 'Masinga Dam', before: 'stable', after: 'stable' },
    ],
  },
  {
    id: 'water-infra',
    name: 'Nairobi Water Infrastructure',
    description: 'Northern Collector Tunnel completion + pipe network rehabilitation targeting 40% leakage reduction.',
    intervention: 'Tunnel completion + smart metering + pipe replacement',
    cost: '$180M over 5 years',
    timeframe: '2026–2031',
    outcomes: [
      { entity: 'Nairobi Water', metric: 'Daily Deficit', baseline: '200K m³', projected: '80K m³', trend: 'down', confidence: 'high' },
      { entity: 'Nairobi Water', metric: 'Pipe Leakage', baseline: '38%', projected: '22%', trend: 'down', confidence: 'medium' },
      { entity: 'Kibera Community', metric: 'Water Access', baseline: '45%', projected: '68%', trend: 'up', confidence: 'medium' },
      { entity: 'Nairobi Health', metric: 'Waterborne Cases', baseline: '+34%', projected: '-8%', trend: 'down', confidence: 'low' },
    ],
    systemImpact: [
      { label: 'Nairobi Water', before: 'stressed', after: 'recovering' },
      { label: 'Kibera Community', before: 'critical', after: 'stressed' },
      { label: 'Nairobi Health', before: 'stressed', after: 'recovering' },
    ],
  },
  {
    id: 'irrigation-modernize',
    name: 'Mwea Irrigation Modernization',
    description: 'Drip irrigation conversion + water recycling + crop diversification for 30K smallholders.',
    intervention: 'Technology upgrade + farmer training + market linkage',
    cost: '$45M over 4 years',
    timeframe: '2026–2030',
    outcomes: [
      { entity: 'Mwea Irrigation', metric: 'Water Efficiency', baseline: '40%', projected: '72%', trend: 'up', confidence: 'medium' },
      { entity: 'Mwea Irrigation', metric: 'Rice Yield', baseline: '4.2 t/ha', projected: '6.1 t/ha', trend: 'up', confidence: 'medium' },
      { entity: 'Nairobi Food', metric: 'Staple Inflation', baseline: '+14%', projected: '+4%', trend: 'down', confidence: 'low' },
      { entity: 'Mwea Irrigation', metric: 'Farmer Income', baseline: '$1,200/yr', projected: '$2,100/yr', trend: 'up', confidence: 'low' },
    ],
    systemImpact: [
      { label: 'Mwea Irrigation', before: 'stressed', after: 'stable' },
      { label: 'Nairobi Food Markets', before: 'stressed', after: 'recovering' },
      { label: 'Kibera Community', before: 'critical', after: 'stressed' },
    ],
  },
];

const trendIcon = (t: 'up' | 'down' | 'stable') =>
  t === 'up' ? <TrendingUp className="h-3 w-3" /> :
  t === 'down' ? <TrendingDown className="h-3 w-3" /> :
  <Minus className="h-3 w-3" />;

interface ScenarioProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScenarioComparison({ isOpen, onClose }: ScenarioProps) {
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['reforestation', 'water-infra']);

  const toggleScenario = (id: string) => {
    setSelectedScenarios(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const selected = scenarios.filter(s => selectedScenarios.includes(s.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute inset-4 z-50 flex flex-col rounded-xl border border-border/50 bg-card/98 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-display text-sm font-semibold text-foreground">Scenario Comparison</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Simulate interventions · Compare outcomes</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scenario selector */}
          <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Select scenarios:</span>
            {scenarios.map(s => (
              <button
                key={s.id}
                onClick={() => toggleScenario(s.id)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                  selectedScenarios.includes(s.id)
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Comparison Grid */}
          <div className="flex-1 overflow-auto p-4">
            <div className={`grid gap-4 ${selected.length === 1 ? 'grid-cols-1' : selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {selected.map(scenario => (
                <div key={scenario.id} className="flex flex-col rounded-lg border border-border/40 bg-muted/10">
                  {/* Scenario Header */}
                  <div className="border-b border-border/30 p-4">
                    <h3 className="font-display text-sm font-semibold text-foreground">{scenario.name}</h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{scenario.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/30 px-2 py-1.5">
                        <span className="font-mono text-[9px] text-muted-foreground">Investment</span>
                        <div className="font-mono text-xs font-medium text-foreground">{scenario.cost}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5">
                        <span className="font-mono text-[9px] text-muted-foreground">Timeframe</span>
                        <div className="font-mono text-xs font-medium text-foreground">{scenario.timeframe}</div>
                      </div>
                    </div>
                  </div>

                  {/* Intervention */}
                  <div className="border-b border-border/30 p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Intervention</span>
                    <p className="mt-1 text-[10px] text-foreground/70">{scenario.intervention}</p>
                  </div>

                  {/* Projected Outcomes */}
                  <div className="border-b border-border/30 p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Projected Outcomes</span>
                    <div className="mt-2 space-y-2">
                      {scenario.outcomes.map((o, i) => (
                        <div key={i} className="rounded-md bg-muted/20 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] text-muted-foreground">{o.entity} · {o.metric}</span>
                            <ConfidenceIndicator level={o.confidence} />
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground line-through">{o.baseline}</span>
                            <ArrowRight className="h-3 w-3 text-primary/50" />
                            <span className="font-mono text-xs font-medium text-foreground">{o.projected}</span>
                            <span className={o.trend === 'up' ? 'text-status-stable' : o.trend === 'down' ? 'text-status-stable' : 'text-muted-foreground'}>
                              {trendIcon(o.trend)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System State Changes */}
                  <div className="p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-primary">System State Impact</span>
                    <div className="mt-2 space-y-1.5">
                      {scenario.systemImpact.map((si, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-1 font-mono text-[10px] text-foreground/70">{si.label}</span>
                          <SystemStateBadge status={si.before} />
                          <ArrowRight className="h-3 w-3 text-primary/40" />
                          <SystemStateBadge status={si.after} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
