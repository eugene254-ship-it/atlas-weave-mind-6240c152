import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { entities, relationships, causalChains, entityTypeConfig, type WorldEntity } from '@/data/worldModelData';
import { Download } from 'lucide-react';

interface Props {
  selectedEntityId?: string | null;
  liveEntities?: WorldEntity[];
}

export function ExportButton({ selectedEntityId, liveEntities }: Props) {
  const allEntities = liveEntities || entities;

  const exportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title page
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(28);
    doc.text('Atlas World Model', 20, 40);
    doc.setFontSize(12);
    doc.setTextColor(120, 140, 150);
    doc.text('System State Report', 20, 52);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 20, 62);
    doc.text(`Entities: ${allEntities.length} | Relationships: ${relationships.length}`, 20, 72);

    const stressedCount = allEntities.filter(e => e.status === 'stressed' || e.status === 'critical').length;
    const criticalCount = allEntities.filter(e => e.status === 'critical').length;
    doc.text(`System Health: ${allEntities.length - stressedCount} stable, ${stressedCount - criticalCount} stressed, ${criticalCount} critical`, 20, 82);

    // Entity overview table
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Entity Overview', 20, 25);

    autoTable(doc, {
      startY: 35,
      head: [['Entity', 'Type', 'Status', 'Confidence', 'Location', 'Key Metrics']],
      body: allEntities.map(e => [
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
      alternateRowStyles: {
        fillColor: [25, 30, 38],
      },
    });

    // Risk assessment page
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Risk Assessment', 20, 25);

    const riskRows: string[][] = [];
    allEntities.forEach(e => {
      e.risks.forEach(r => {
        riskRows.push([e.name, entityTypeConfig[e.type].label, e.status.toUpperCase(), r]);
      });
    });

    autoTable(doc, {
      startY: 35,
      head: [['Entity', 'Type', 'Status', 'Risk']],
      body: riskRows,
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

    // Causal analysis page
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Causal Analysis', 20, 25);

    let causalY = 35;
    Object.entries(causalChains).forEach(([chainId, steps]) => {
      doc.setFontSize(12);
      doc.setTextColor(100, 210, 190);
      doc.text(`Chain: ${chainId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, 20, causalY);
      causalY += 8;

      autoTable(doc, {
        startY: causalY,
        head: [['Step', 'Status', 'Confidence', 'Detail']],
        body: steps.map(s => [s.label, s.status.toUpperCase(), s.confidence, s.detail]),
        styles: {
          fillColor: [20, 24, 30],
          textColor: [180, 195, 210],
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [30, 40, 50],
          textColor: [100, 210, 190],
          fontSize: 8,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [25, 30, 38] },
      });

      causalY = (doc as any).lastAutoTable.finalY + 12;
      if (causalY > 170) {
        doc.addPage();
        doc.setFillColor(15, 18, 22);
        doc.rect(0, 0, pageWidth, 210, 'F');
        causalY = 25;
      }
    });

    // Selected entity detail page
    if (selectedEntityId) {
      const entity = allEntities.find(e => e.id === selectedEntityId);
      if (entity) {
        doc.addPage();
        doc.setFillColor(15, 18, 22);
        doc.rect(0, 0, pageWidth, 210, 'F');
        doc.setTextColor(200, 220, 230);
        doc.setFontSize(18);
        doc.text(`Entity Detail: ${entity.name}`, 20, 25);
        doc.setFontSize(10);
        doc.setTextColor(120, 140, 150);
        doc.text(`${entityTypeConfig[entity.type].label} · ${entity.location || 'Global'} · Status: ${entity.status.toUpperCase()} · Confidence: ${entity.confidence}`, 20, 35);
        doc.setTextColor(180, 195, 210);
        doc.setFontSize(9);

        const lines = doc.splitTextToSize(entity.description, pageWidth - 40);
        doc.text(lines, 20, 45);

        autoTable(doc, {
          startY: 55 + lines.length * 4,
          head: [['Metric', 'Value', 'Trend']],
          body: entity.metrics.map(m => [m.label, m.value, m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→']),
          styles: { fillColor: [20, 24, 30], textColor: [180, 195, 210], fontSize: 9 },
          headStyles: { fillColor: [30, 40, 50], textColor: [100, 210, 190], fontSize: 9, fontStyle: 'bold' },
        });
      }
    }

    // Relationship table
    doc.addPage();
    doc.setFillColor(15, 18, 22);
    doc.rect(0, 0, pageWidth, 210, 'F');
    doc.setTextColor(200, 220, 230);
    doc.setFontSize(18);
    doc.text('Relationship Map', 20, 25);

    autoTable(doc, {
      startY: 35,
      head: [['Source', 'Relationship', 'Target', 'Strength', 'Confidence']],
      body: relationships.map(r => {
        const src = allEntities.find(e => e.id === r.source);
        const tgt = allEntities.find(e => e.id === r.target);
        return [src?.name || r.source, r.type, tgt?.name || r.target, `${Math.round(r.strength * 100)}%`, r.confidence];
      }),
      styles: { fillColor: [20, 24, 30], textColor: [180, 195, 210], fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 40, 50], textColor: [100, 210, 190], fontSize: 9, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [25, 30, 38] },
    });

    doc.save('atlas-world-model-report.pdf');
  }, [allEntities, selectedEntityId]);

  return (
    <button
      onClick={exportPdf}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      title="Export PDF Report"
    >
      <Download className="h-3 w-3" />
      <span className="hidden lg:inline">Export</span>
    </button>
  );
}
