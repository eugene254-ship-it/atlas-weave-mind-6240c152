import { motion, AnimatePresence } from 'framer-motion';
import { X, Satellite, Radio, BarChart3, FileText, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { type WorldEntity } from '@/data/worldModelData';
import { ConfidenceIndicator } from './SystemStateBadge';

interface Props {
  entity: WorldEntity | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EvidenceSource {
  type: 'satellite' | 'sensor' | 'statistical' | 'survey' | 'model';
  label: string;
  detail: string;
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
  provenance: string;
}

const sourceIcon = {
  satellite: Satellite,
  sensor: Radio,
  statistical: BarChart3,
  survey: FileText,
  model: ShieldCheck,
};

const sourceLabel = {
  satellite: 'Satellite Imagery',
  sensor: 'Sensor Network',
  statistical: 'Statistical Data',
  survey: 'Field Survey',
  model: 'Model Estimate',
};

// Generate evidence for each entity
function getEvidence(entity: WorldEntity): EvidenceSource[] {
  const base: EvidenceSource[] = [];

  if (entity.type === 'ecosystem') {
    base.push(
      { type: 'satellite', label: 'Vegetation Index (NDVI)', detail: `Landsat-9 imagery showing ${entity.status === 'stressed' ? 'declining' : 'stable'} vegetation health across ${entity.location || 'region'}. Resolution: 30m. Processing: Google Earth Engine.`, confidence: 'high', lastUpdated: 'Mar 2026', provenance: 'NASA/USGS Landsat Programme' },
      { type: 'sensor', label: 'Hydrological Gauges', detail: `Flow rate and water level readings from ${entity.id.includes('river') ? '12 gauge stations' : '8 monitoring points'} along the system. Real-time telemetry with 15-min intervals.`, confidence: 'high', lastUpdated: 'Mar 2026', provenance: 'Kenya Water Resources Authority' },
      { type: 'model', label: 'Climate Projection', detail: `CMIP6 ensemble model projecting ${entity.metrics[0]?.trend === 'down' ? 'declining' : 'variable'} conditions. RCP 4.5 scenario. 20-model ensemble mean with uncertainty bands.`, confidence: 'medium', lastUpdated: 'Jan 2026', provenance: 'IPCC AR6 / Kenya Met Department' },
    );
  } else if (entity.type === 'infrastructure') {
    base.push(
      { type: 'sensor', label: 'SCADA Telemetry', detail: `Operational readings from infrastructure control systems. Monitoring capacity utilization, structural stress indicators, and performance metrics.`, confidence: 'high', lastUpdated: 'Mar 2026', provenance: 'Kenya Power / NCWSC Operations' },
      { type: 'statistical', label: 'Maintenance Records', detail: `Historical maintenance logs, inspection reports, and lifecycle assessments. ${entity.timeline.length} events logged in observation period.`, confidence: 'high', lastUpdated: 'Feb 2026', provenance: 'Asset Management Database' },
      { type: 'satellite', label: 'Structure Monitoring', detail: `InSAR deformation analysis and optical change detection. Sub-centimetre displacement tracking for structural integrity assessment.`, confidence: 'medium', lastUpdated: 'Feb 2026', provenance: 'ESA Sentinel-1 / Copernicus' },
    );
  } else if (entity.type === 'community' || entity.type === 'health') {
    base.push(
      { type: 'survey', label: 'Community Assessment', detail: `Household surveys covering food security, water access, health outcomes, and livelihood indicators. Sample size: ${entity.type === 'community' ? '2,400' : '1,800'} households.`, confidence: entity.confidence, lastUpdated: 'Jan 2026', provenance: 'Kenya National Bureau of Statistics' },
      { type: 'statistical', label: 'Health Information System', detail: `DHIS2 facility reporting data. Aggregated from ${entity.type === 'health' ? '800+' : '45'} health facilities. Monthly reporting cycle.`, confidence: 'medium', lastUpdated: 'Feb 2026', provenance: 'Kenya Ministry of Health / DHIS2' },
      { type: 'model', label: 'Vulnerability Model', detail: `Machine learning model estimating household vulnerability from proxy indicators. Trained on 5 years of survey data. AUC: 0.82.`, confidence: 'low', lastUpdated: 'Dec 2025', provenance: 'Atlas AI Engine v2.3' },
    );
  } else {
    base.push(
      { type: 'statistical', label: 'Market Data', detail: `Price indices, trade volumes, and supply chain metrics from government statistical releases and market monitoring systems.`, confidence: 'high', lastUpdated: 'Mar 2026', provenance: 'Kenya National Bureau of Statistics' },
      { type: 'sensor', label: 'Transport Monitoring', detail: `GPS tracking data from logistics fleet. Coverage: major corridors and distribution networks. Daily aggregation.`, confidence: 'medium', lastUpdated: 'Mar 2026', provenance: 'KeNHA / Private Logistics Partners' },
      { type: 'model', label: 'Economic Forecast', detail: `Econometric model projecting market conditions based on supply, demand, and macroeconomic indicators. Monthly recalibration.`, confidence: 'medium', lastUpdated: 'Feb 2026', provenance: 'Atlas Economic Module v1.8' },
    );
  }

  return base;
}

export function EvidenceDrawer({ entity, isOpen, onClose }: Props) {
  if (!entity) return null;
  const evidence = getEvidence(entity);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="absolute inset-x-0 bottom-0 z-40 flex max-h-[55%] flex-col rounded-t-xl border-t border-border/50 bg-card/98 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Evidence & Provenance</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {entity.name} · {evidence.length} sources
                </span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Evidence Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {evidence.map((src, i) => {
                const Icon = sourceIcon[src.type];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group rounded-lg border border-border/40 bg-muted/30 p-4 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          {sourceLabel[src.type]}
                        </span>
                      </div>
                      <ConfidenceIndicator level={src.confidence} />
                    </div>

                    <h4 className="mb-1.5 font-display text-xs font-semibold text-foreground">{src.label}</h4>
                    <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{src.detail}</p>

                    <div className="flex items-center justify-between border-t border-border/20 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-muted-foreground">Updated: {src.lastUpdated}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary/60 transition-colors group-hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                        <span className="font-mono text-[9px]">Source</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[9px] text-muted-foreground">{src.provenance}</span>
                    </div>

                    {src.confidence === 'low' && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-status-stressed/5 px-2 py-1">
                        <AlertTriangle className="h-3 w-3 text-status-stressed" />
                        <span className="font-mono text-[9px] text-status-stressed">Model-estimated · Use with caution</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
