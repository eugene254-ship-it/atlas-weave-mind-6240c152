import { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, TrendingDown, TrendingUp, Minus, AlertTriangle, Shield, Droplets, Wheat, Heart, Building2, TreePine, Zap, Download, FileText, FileSpreadsheet, ChevronLeft, ChevronRight, Search, Filter, Bookmark, Share2, Check, Trash2 } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WorldEntity, EntityStatus, EntityType } from '@/data/worldModelData';
import { entityTypeConfig } from '@/data/worldModelData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entities: WorldEntity[];
  onEntitySelect: (id: string) => void;
}

const statusOrder: EntityStatus[] = ['critical', 'stressed', 'degraded', 'uncertain', 'recovering', 'stable'];
const statusLabels: Record<EntityStatus, string> = {
  critical: 'Critical',
  stressed: 'Stressed',
  degraded: 'Degraded',
  uncertain: 'Uncertain',
  recovering: 'Recovering',
  stable: 'Stable',
};
const statusColors: Record<EntityStatus, string> = {
  critical: 'bg-status-critical',
  stressed: 'bg-status-stressed',
  degraded: 'bg-[hsl(20,70%,45%)]',
  uncertain: 'bg-status-uncertain',
  recovering: 'bg-status-recovering',
  stable: 'bg-status-stable',
};
const statusTextColors: Record<EntityStatus, string> = {
  critical: 'text-status-critical',
  stressed: 'text-status-stressed',
  degraded: 'text-[hsl(20,70%,45%)]',
  uncertain: 'text-status-uncertain',
  recovering: 'text-status-recovering',
  stable: 'text-status-stable',
};
const statusHslColors: Record<EntityStatus, string> = {
  critical: 'hsl(0, 85%, 55%)',
  stressed: 'hsl(30, 85%, 55%)',
  degraded: 'hsl(20, 70%, 45%)',
  uncertain: 'hsl(45, 75%, 55%)',
  recovering: 'hsl(200, 70%, 50%)',
  stable: 'hsl(165, 65%, 45%)',
};

const entityIcons: Record<string, typeof Droplets> = {
  'river-tana': Droplets,
  'dam-masinga': Building2,
  'irrigation-mwea': Wheat,
  'water-nairobi': Droplets,
  'food-nairobi': Wheat,
  'community-kibera': Shield,
  'health-nairobi': Heart,
  'hydro-kindaruma': Zap,
  'forest-upper-tana': TreePine,
  'rainfall-east': Droplets,
};

// Generate mock historical data for sparklines
function generateHistoricalData(entity: WorldEntity, points = 12) {
  const statusScore: Record<EntityStatus, number> = {
    stable: 90, recovering: 70, uncertain: 55, degraded: 40, stressed: 25, critical: 10,
  };
  const baseScore = statusScore[entity.status];
  const mid = points / 2;
  return Array.from({ length: points }, (_, i) => ({
    time: i,
    value: Math.max(5, Math.min(95, baseScore + (Math.random() - 0.5) * 30 + (i - mid) * (Math.random() > 0.5 ? 0.5 : -0.5))),
  }));
}

type RangeKey = '24h' | '7d' | '30d';
const RANGE_CONFIG: Record<RangeKey, { points: number; label: string; tickLabel: (i: number, total: number) => string }> = {
  '24h': { points: 24, label: '24-Hour', tickLabel: (i, t) => `T-${t - 1 - i}h` },
  '7d': { points: 28, label: '7-Day', tickLabel: (i, t) => `D-${Math.round((t - 1 - i) / 4)}` },
  '30d': { points: 30, label: '30-Day', tickLabel: (i, t) => `D-${t - 1 - i}` },
};

const RISK_WEIGHT: Record<EntityStatus, number> = {
  critical: 100, stressed: 75, degraded: 60, uncertain: 40, recovering: 25, stable: 10,
};

interface DrillPreset {
  id: string;
  name: string;
  status: EntityStatus;
  range: RangeKey;
  type: EntityType | 'all';
  search: string;
  createdAt: number;
}

const PRESETS_KEY = 'atlas:drill-presets';

function loadPresets(): DrillPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {/* ignore */}
  return [];
}

function savePresets(presets: DrillPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch {/* ignore */}
}

export function DashboardOverview({ isOpen, onClose, entities, onEntitySelect }: Props) {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [drillStatus, setDrillStatus] = useState<EntityStatus | null>(null);
  const [drillRange, setDrillRange] = useState<RangeKey>('24h');
  const [drillSearch, setDrillSearch] = useState('');
  const [drillType, setDrillType] = useState<EntityType | 'all'>('all');
  const [showDrillExport, setShowDrillExport] = useState(false);
  const [presets, setPresets] = useState<DrillPreset[]>(() => loadPresets());
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [perEntityMenu, setPerEntityMenu] = useState<string | null>(null);

  // Load drill state from URL on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ds = params.get('drill') as EntityStatus | null;
      if (ds && ['stable', 'stressed', 'critical', 'recovering', 'uncertain', 'degraded'].includes(ds)) {
        setDrillStatus(ds);
        const r = params.get('range') as RangeKey | null;
        if (r && (r === '24h' || r === '7d' || r === '30d')) setDrillRange(r);
        const t = params.get('type');
        if (t) setDrillType(t as EntityType | 'all');
        const q = params.get('q');
        if (q) setDrillSearch(q);
      }
    } catch {/* ignore */}
  }, [isOpen]);

  // Sync drill state to URL
  useEffect(() => {
    if (!isOpen) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (drillStatus) {
        params.set('drill', drillStatus);
        params.set('range', drillRange);
        params.set('type', drillType);
        if (drillSearch) params.set('q', drillSearch); else params.delete('q');
      } else {
        params.delete('drill'); params.delete('range'); params.delete('type'); params.delete('q');
      }
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? '?' + qs : ''}${window.location.hash}`);
    } catch {/* ignore */}
  }, [isOpen, drillStatus, drillRange, drillType, drillSearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<EntityStatus, number> = {
      stable: 0, stressed: 0, critical: 0, recovering: 0, uncertain: 0, degraded: 0,
    };
    entities.forEach(e => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [entities]);

  const systemHealth = useMemo(() => {
    const weights: Record<EntityStatus, number> = {
      stable: 1, recovering: 0.7, uncertain: 0.5, stressed: 0.35, degraded: 0.2, critical: 0,
    };
    const total = entities.reduce((sum, e) => sum + (weights[e.status] || 0), 0);
    return Math.round((total / entities.length) * 100);
  }, [entities]);

  const healthColor = systemHealth >= 70 ? 'text-status-stable' : systemHealth >= 40 ? 'text-status-stressed' : 'text-status-critical';

  const topRisks = useMemo(() => {
    return entities
      .filter(e => e.status === 'critical' || e.status === 'stressed' || e.status === 'degraded')
      .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
      .slice(0, 5)
      .map(e => ({
        entity: e,
        topRisk: e.risks[0] || 'Unknown risk',
        decliningMetrics: e.metrics.filter(m => m.trend === 'down').length,
        historicalData: generateHistoricalData(e),
      }));
  }, [entities]);

  const metricSummary = useMemo(() => {
    let declining = 0, rising = 0, stable = 0;
    entities.forEach(e => e.metrics.forEach(m => {
      if (m.trend === 'down') declining++;
      else if (m.trend === 'up') rising++;
      else stable++;
    }));
    return { declining, rising, stable, total: declining + rising + stable };
  }, [entities]);

  // Historical trend data for the overview chart
  const overallTrendData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: i,
      health: Math.max(20, Math.min(95, systemHealth + (Math.random() - 0.5) * 20 + (i - 12) * 0.5)),
      critical: statusCounts.critical + Math.floor(Math.random() * 2),
      stressed: statusCounts.stressed + Math.floor(Math.random() * 2),
    }));
  }, [systemHealth, statusCounts]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title page
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(28);
    doc.text('System Health Report', 20, 40);
    doc.setFontSize(12);
    doc.setTextColor(120, 140, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 20, 52);
    doc.text(`System Health Score: ${systemHealth}/100`, 20, 62);
    doc.text(`Entities Monitored: ${entities.length}`, 20, 72);

    // Status summary
    doc.setFontSize(10);
    let yPos = 85;
    statusOrder.forEach(status => {
      if (statusCounts[status] > 0) {
        doc.text(`${statusLabels[status]}: ${statusCounts[status]}`, 20, yPos);
        yPos += 8;
      }
    });

    // Risk alerts page
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Priority Risk Alerts', 20, 25);

    const riskData = topRisks.map(({ entity, topRisk, decliningMetrics }) => [
      entity.name,
      entityTypeConfig[entity.type].label,
      entity.status.toUpperCase(),
      topRisk,
      `${decliningMetrics} declining`,
      entity.confidence,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Entity', 'Type', 'Status', 'Primary Risk', 'Metrics', 'Confidence']],
      body: riskData,
      styles: {
        fillColor: [20, 24, 30],
        textColor: [180, 195, 210],
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [50, 30, 30],
        textColor: [230, 120, 100],
        fontSize: 9,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [25, 30, 38] },
    });

    // All entities page
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('All Monitored Entities', 20, 25);

    autoTable(doc, {
      startY: 35,
      head: [['Entity', 'Type', 'Status', 'Confidence', 'Location', 'Key Metrics']],
      body: entities.map(e => [
        e.name,
        entityTypeConfig[e.type].label,
        e.status.toUpperCase(),
        e.confidence,
        e.location || 'Global',
        e.metrics.slice(0, 2).map(m => `${m.label}: ${m.value}`).join(', '),
      ]),
      styles: {
        fillColor: [20, 24, 30],
        textColor: [180, 195, 210],
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 40, 50],
        textColor: [100, 210, 190],
        fontSize: 9,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [25, 30, 38] },
    });

    // Metric trends page
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Metric Trends Summary', 20, 25);
    doc.setFontSize(12);
    doc.text(`Total Metrics: ${metricSummary.total}`, 20, 40);
    doc.text(`Declining: ${metricSummary.declining} (${Math.round(metricSummary.declining / metricSummary.total * 100)}%)`, 20, 50);
    doc.text(`Rising: ${metricSummary.rising} (${Math.round(metricSummary.rising / metricSummary.total * 100)}%)`, 20, 60);
    doc.text(`Stable: ${metricSummary.stable} (${Math.round(metricSummary.stable / metricSummary.total * 100)}%)`, 20, 70);

    doc.save('system-health-report.pdf');
    setShowExportMenu(false);
  }, [entities, systemHealth, statusCounts, topRisks, metricSummary]);

  const exportCSV = useCallback(() => {
    const headers = ['Entity', 'Type', 'Status', 'Confidence', 'Location', 'Risks', 'Metrics'];
    const rows = entities.map(e => [
      e.name,
      entityTypeConfig[e.type].label,
      e.status,
      e.confidence,
      e.location || 'Global',
      e.risks.join('; '),
      e.metrics.map(m => `${m.label}: ${m.value} (${m.trend})`).join('; '),
    ]);

    const csvContent = [
      `System Health Report - Generated ${new Date().toISOString()}`,
      `System Health Score: ${systemHealth}/100`,
      `Total Entities: ${entities.length}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'system-health-report.csv';
    link.click();
    setShowExportMenu(false);
  }, [entities, systemHealth]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-xl border border-border/50 bg-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">System Dashboard</h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Real-time health overview · {entities.length} entities monitored
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Export button */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full mt-1 z-10 rounded-lg border border-border/50 bg-card shadow-xl"
                      >
                        <button
                          onClick={exportPDF}
                          className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[10px] text-foreground hover:bg-muted/40 rounded-t-lg"
                        >
                          <FileText className="h-3.5 w-3.5 text-status-critical" />
                          Export as PDF
                        </button>
                        <button
                          onClick={exportCSV}
                          className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[10px] text-foreground hover:bg-muted/40 rounded-b-lg"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-status-stable" />
                          Export as CSV
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto p-4 space-y-4">
              {/* Drill-down overlay */}
              <AnimatePresence>
                {drillStatus && (() => {
                  const cohort = entities.filter(e => e.status === drillStatus);
                  const types = Array.from(new Set(cohort.map(e => e.type)));
                  const drillEntities = cohort
                    .filter(e => drillType === 'all' || e.type === drillType)
                    .filter(e => {
                      if (!drillSearch.trim()) return true;
                      const q = drillSearch.toLowerCase();
                      return e.name.toLowerCase().includes(q)
                        || e.type.toLowerCase().includes(q)
                        || (e.location || '').toLowerCase().includes(q);
                    })
                    .sort((a, b) => {
                      const decA = a.metrics.filter(m => m.trend === 'down').length;
                      const decB = b.metrics.filter(m => m.trend === 'down').length;
                      const riskA = RISK_WEIGHT[a.status] + decA * 5;
                      const riskB = RISK_WEIGHT[b.status] + decB * 5;
                      return riskB - riskA;
                    });

                  const range = RANGE_CONFIG[drillRange];
                  const histById: Record<string, { time: number; value: number }[]> = {};
                  drillEntities.forEach(e => { histById[e.id] = generateHistoricalData(e, range.points); });

                  const drillSeries = Array.from({ length: range.points }, (_, i) => {
                    const point: Record<string, number | string> = { time: range.tickLabel(i, range.points) };
                    drillEntities.forEach(e => {
                      const v = histById[e.id]?.[i]?.value ?? 50;
                      point[e.name] = Math.round(v);
                    });
                    return point;
                  });
                  const avgScore = Math.round(
                    drillEntities.reduce((s, e) => {
                      const sc: Record<EntityStatus, number> = { stable: 90, recovering: 70, uncertain: 55, degraded: 40, stressed: 25, critical: 10 };
                      return s + sc[e.status];
                    }, 0) / Math.max(1, drillEntities.length)
                  );
                  const palette = ['hsl(200,70%,55%)', 'hsl(280,60%,60%)', 'hsl(45,75%,55%)', 'hsl(165,65%,45%)', 'hsl(0,75%,55%)', 'hsl(30,85%,55%)', 'hsl(140,55%,50%)', 'hsl(320,60%,60%)'];

                  const exportCohortCSV = () => {
                    const headers = ['time', ...drillEntities.map(e => e.name)];
                    const rows = drillSeries.map(r => headers.map(h => String(r[h] ?? '')));
                    const meta = [
                      `# ${statusLabels[drillStatus]} cohort · ${range.label} history`,
                      `# Generated ${new Date().toISOString()}`,
                      `# Entities: ${drillEntities.length} · Avg score: ${avgScore}`,
                      '',
                    ];
                    const csv = [...meta, headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `cohort-${drillStatus}-${drillRange}.csv`;
                    a.click();
                    setShowDrillExport(false);
                  };

                  const exportCohortPDF = () => {
                    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    doc.setFillColor(15, 18, 22);
                    doc.rect(0, 0, pageWidth, 210, 'F');
                    doc.setTextColor(200, 220, 230);
                    doc.setFontSize(20);
                    doc.text(`${statusLabels[drillStatus]} Cohort — ${range.label} Report`, 20, 25);
                    doc.setFontSize(10);
                    doc.setTextColor(120, 140, 150);
                    doc.text(`Generated ${new Date().toLocaleString()}`, 20, 34);
                    doc.text(`Entities: ${drillEntities.length} · Average score: ${avgScore}`, 20, 41);

                    autoTable(doc, {
                      startY: 50,
                      head: [['Entity', 'Type', 'Location', 'Risk', 'Declining', 'Rising', 'Confidence']],
                      body: drillEntities.map(e => [
                        e.name,
                        entityTypeConfig[e.type].label,
                        e.location || 'Global',
                        e.risks[0] || '—',
                        String(e.metrics.filter(m => m.trend === 'down').length),
                        String(e.metrics.filter(m => m.trend === 'up').length),
                        e.confidence,
                      ]),
                      styles: { fillColor: [20, 24, 30], textColor: [180, 195, 210], fontSize: 8, cellPadding: 3 },
                      headStyles: { fillColor: [30, 40, 50], textColor: [100, 210, 190], fontSize: 9, fontStyle: 'bold' },
                      alternateRowStyles: { fillColor: [25, 30, 38] },
                    });

                    // Per-entity sparkline data table
                    doc.addPage();
                    doc.setFillColor(15, 18, 22);
                    doc.rect(0, 0, pageWidth, 210, 'F');
                    doc.setTextColor(200, 220, 230);
                    doc.setFontSize(16);
                    doc.text(`Per-Entity ${range.label} History`, 20, 25);

                    drillEntities.forEach((e) => {
                      const data = histById[e.id] || [];
                      const min = Math.round(Math.min(...data.map(d => d.value)));
                      const max = Math.round(Math.max(...data.map(d => d.value)));
                      const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / Math.max(1, data.length));
                      autoTable(doc, {
                        head: [[`${e.name}  ·  min ${min} / avg ${avg} / max ${max}`]],
                        body: [[data.map(d => Math.round(d.value)).join('  ·  ')]],
                        styles: { fillColor: [20, 24, 30], textColor: [180, 195, 210], fontSize: 7, cellPadding: 2 },
                        headStyles: { fillColor: [30, 40, 50], textColor: [100, 210, 190], fontSize: 8, fontStyle: 'bold' },
                      });
                    });

                    doc.save(`cohort-${drillStatus}-${drillRange}.pdf`);
                    setShowDrillExport(false);
                  };

                  return (
                    <motion.div
                      key={drillStatus}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 z-10 flex flex-col bg-card"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => setDrillStatus(null)}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <div className={`h-2.5 w-2.5 rounded-full ${statusColors[drillStatus]}`} />
                          <h3 className="font-display text-sm font-semibold text-foreground">
                            {statusLabels[drillStatus]} Entities
                          </h3>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {drillEntities.length} of {cohort.length} · avg score {avgScore}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Range selector */}
                          <div className="flex rounded-md border border-border/50 bg-muted/20 p-0.5">
                            {(Object.keys(RANGE_CONFIG) as RangeKey[]).map(k => (
                              <button
                                key={k}
                                onClick={() => setDrillRange(k)}
                                className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                                  drillRange === k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {k}
                              </button>
                            ))}
                          </div>
                          {/* Cohort export */}
                          <div className="relative">
                            <button
                              onClick={() => setShowDrillExport(!showDrillExport)}
                              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                            >
                              <Download className="h-3 w-3" />
                              Export
                            </button>
                            <AnimatePresence>
                              {showDrillExport && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-border/50 bg-card shadow-xl"
                                >
                                  <button
                                    onClick={exportCohortPDF}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[10px] text-foreground hover:bg-muted/40 rounded-t-lg whitespace-nowrap"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-status-critical" />
                                    Cohort PDF
                                  </button>
                                  <button
                                    onClick={exportCohortCSV}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-[10px] text-foreground hover:bg-muted/40 rounded-b-lg whitespace-nowrap"
                                  >
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-status-stable" />
                                    Cohort CSV
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Filter / search bar */}
                      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={drillSearch}
                            onChange={e => setDrillSearch(e.target.value)}
                            placeholder="Search by name, type, or location…"
                            className="w-full rounded-md border border-border/50 bg-muted/20 py-1.5 pl-7 pr-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Filter className="h-3 w-3 text-muted-foreground" />
                          <select
                            value={drillType}
                            onChange={e => setDrillType(e.target.value as EntityType | 'all')}
                            className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 font-mono text-[10px] text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="all">All types</option>
                            {types.map(t => (
                              <option key={t} value={t}>{entityTypeConfig[t].label}</option>
                            ))}
                          </select>
                        </div>
                        <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                          Sorted by risk
                        </span>
                      </div>

                      <div className="flex-1 overflow-auto p-4 space-y-4">
                        {/* Combined historical chart */}
                        <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            {range.label} Health History — {statusLabels[drillStatus]} cohort
                          </span>
                          <div className="mt-3 h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={drillSeries} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={Math.max(1, Math.floor(range.points / 8))} />
                                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                                <Tooltip
                                  contentStyle={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                  }}
                                />
                                {drillEntities.map((e, idx) => (
                                  <Line
                                    key={e.id}
                                    type="monotone"
                                    dataKey={e.name}
                                    stroke={palette[idx % palette.length]}
                                    strokeWidth={1.5}
                                    dot={false}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Per-entity breakdown cards */}
                        <div className="grid grid-cols-2 gap-3">
                          {drillEntities.map((entity, idx) => {
                            const Icon = entityIcons[entity.id] || Activity;
                            const histData = histById[entity.id] || generateHistoricalData(entity, range.points);
                            const declining = entity.metrics.filter(m => m.trend === 'down').length;
                            const rising = entity.metrics.filter(m => m.trend === 'up').length;
                            return (
                              <button
                                key={entity.id}
                                onClick={() => { onEntitySelect(entity.id); onClose(); }}
                                className="rounded-lg border border-border/40 bg-muted/10 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusColors[entity.status]}/15`}
                                    style={{ backgroundColor: `${statusHslColors[entity.status]}22` }}>
                                    <Icon className={`h-4 w-4 ${statusTextColors[entity.status]}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono text-[11px] font-medium text-foreground truncate">{entity.name}</div>
                                    <div className="font-mono text-[9px] text-muted-foreground">
                                      {entityTypeConfig[entity.type].label} · {entity.location || 'Global'}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 h-16">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={histData}>
                                      <defs>
                                        <linearGradient id={`grad-${entity.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor={palette[idx % palette.length]} stopOpacity={0.4} />
                                          <stop offset="100%" stopColor={palette[idx % palette.length]} stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={palette[idx % palette.length]}
                                        strokeWidth={1.5}
                                        fill={`url(#grad-${entity.id})`}
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>

                                <div className="mt-2 flex items-center justify-between font-mono text-[9px]">
                                  <span className="text-muted-foreground">
                                    Risk: <span className="text-foreground/80">{entity.risks[0] || '—'}</span>
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span className="flex items-center gap-0.5 text-status-critical">
                                      <TrendingDown className="h-2.5 w-2.5" />{declining}
                                    </span>
                                    <span className="flex items-center gap-0.5 text-status-stressed">
                                      <TrendingUp className="h-2.5 w-2.5" />{rising}
                                    </span>
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                          {drillEntities.length === 0 && (
                            <div className="col-span-2 rounded-lg border border-dashed border-border/40 p-6 text-center">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {cohort.length === 0
                                  ? `No entities currently in ${statusLabels[drillStatus].toLowerCase()} state`
                                  : 'No entities match the current filters'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Top row: Health score + Status distribution + Metric trends */}
              <div className="grid grid-cols-3 gap-4">
                {/* System Health Score with sparkline */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">System Health</span>
                  <div className="mt-2 flex items-end gap-2">
                    <span className={`font-display text-4xl font-bold ${healthColor}`}>{systemHealth}</span>
                    <span className="mb-1 font-mono text-xs text-muted-foreground">/100</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted/40">
                    <motion.div
                      className={`h-full rounded-full ${systemHealth >= 70 ? 'bg-status-stable' : systemHealth >= 40 ? 'bg-status-stressed' : 'bg-status-critical'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${systemHealth}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  {/* Sparkline trend */}
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallTrendData}>
                        <Line
                          type="monotone"
                          dataKey="health"
                          stroke={systemHealth >= 70 ? statusHslColors.stable : systemHealth >= 40 ? statusHslColors.stressed : statusHslColors.critical}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">24-hour trend</p>
                </div>

                {/* Status Distribution */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Status Distribution</span>
                    <span className="font-mono text-[8px] text-muted-foreground/60">click to drill in</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {statusOrder.filter(s => statusCounts[s] > 0).map(status => (
                      <button
                        key={status}
                        onClick={() => setDrillStatus(status)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/30"
                      >
                        <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                        <span className="flex-1 text-left font-mono text-[10px] text-foreground/70">{statusLabels[status]}</span>
                        <span className={`font-mono text-xs font-medium ${statusTextColors[status]}`}>{statusCounts[status]}</span>
                        <div className="h-1.5 w-16 rounded-full bg-muted/40">
                          <div
                            className={`h-full rounded-full ${statusColors[status]}`}
                            style={{ width: `${(statusCounts[status] / entities.length) * 100}%` }}
                          />
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric Trends with mini chart */}
                <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Metric Trends</span>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-status-critical/10 p-2 text-center">
                      <TrendingDown className="mx-auto h-4 w-4 text-status-critical" />
                      <span className="block font-display text-lg font-bold text-status-critical">{metricSummary.declining}</span>
                      <span className="font-mono text-[7px] text-muted-foreground">declining</span>
                    </div>
                    <div className="rounded-lg bg-status-stressed/10 p-2 text-center">
                      <TrendingUp className="mx-auto h-4 w-4 text-status-stressed" />
                      <span className="block font-display text-lg font-bold text-status-stressed">{metricSummary.rising}</span>
                      <span className="font-mono text-[7px] text-muted-foreground">rising</span>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground" />
                      <span className="block font-display text-lg font-bold text-muted-foreground">{metricSummary.stable}</span>
                      <span className="font-mono text-[7px] text-muted-foreground">stable</span>
                    </div>
                  </div>
                  {/* Mini trend breakdown chart */}
                  <div className="mt-3 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overallTrendData}>
                        <Line type="monotone" dataKey="critical" stroke={statusHslColors.critical} strokeWidth={1} dot={false} />
                        <Line type="monotone" dataKey="stressed" stroke={statusHslColors.stressed} strokeWidth={1} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Risk alerts with sparklines */}
              <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-status-critical" />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-status-critical">Priority Alerts</span>
                </div>
                <div className="mt-3 space-y-2">
                  {topRisks.map(({ entity, topRisk, decliningMetrics, historicalData }) => {
                    const Icon = entityIcons[entity.id] || Activity;
                    return (
                      <motion.div
                        key={entity.id}
                        onHoverStart={() => setHoveredEntity(entity.id)}
                        onHoverEnd={() => setHoveredEntity(null)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                          hoveredEntity === entity.id ? 'border-primary/40 bg-primary/5' : 'border-border/30 bg-muted/10'
                        }`}
                        onClick={() => { onEntitySelect(entity.id); onClose(); }}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          entity.status === 'critical' ? 'bg-status-critical/15' : 'bg-status-stressed/15'
                        }`}>
                          <Icon className={`h-4 w-4 ${statusTextColors[entity.status]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-foreground">{entity.name}</span>
                            <span className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase ${statusColors[entity.status]} text-white`}>
                              {entity.status}
                            </span>
                          </div>
                          <span className="text-[9px] text-muted-foreground">{topRisk}</span>
                        </div>
                        {/* Sparkline */}
                        <div className="h-8 w-20 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalData}>
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={statusHslColors[entity.status]}
                                strokeWidth={1.5}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[9px] text-muted-foreground">
                            {decliningMetrics} metric{decliningMetrics !== 1 ? 's' : ''} declining
                          </div>
                          <div className="font-mono text-[8px] text-muted-foreground/60">
                            Confidence: {entity.confidence}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Entity grid - compact cards with mini sparklines */}
              <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">All Entities</span>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {entities.map(entity => {
                    const Icon = entityIcons[entity.id] || Activity;
                    const sparkData = generateHistoricalData(entity);
                    return (
                      <button
                        key={entity.id}
                        onClick={() => { onEntitySelect(entity.id); onClose(); }}
                        className="group rounded-lg border border-border/30 bg-muted/10 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`h-3.5 w-3.5 ${statusTextColors[entity.status]}`} />
                          <div className={`h-2 w-2 rounded-full ${statusColors[entity.status]}`} />
                        </div>
                        <div className="mt-2 truncate font-mono text-[9px] font-medium text-foreground group-hover:text-primary">
                          {entity.name}
                        </div>
                        {/* Mini sparkline */}
                        <div className="mt-1 h-6">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkData}>
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={statusHslColors[entity.status]}
                                strokeWidth={1}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
