import { useState, useRef, useEffect, useCallback } from 'react';
import { entities, causalChains, type EntityType } from '@/data/worldModelData';
import { WorldCanvas } from '@/components/world-model/WorldCanvas';
import { EntityDetailPanel } from '@/components/world-model/EntityDetailPanel';
import { EntityList } from '@/components/world-model/EntityList';
import { CausalPathViewer } from '@/components/world-model/CausalPathViewer';
import { LayerToggle } from '@/components/world-model/LayerToggle';
import { OntologyBrowser } from '@/components/world-model/OntologyBrowser';
import { TimelineScrubber } from '@/components/world-model/TimelineScrubber';
import { ScenarioComparison } from '@/components/world-model/ScenarioComparison';
import { AnimatePresence } from 'framer-motion';
import { Globe, List, Network, Activity, BookOpen, Clock, Beaker, Waves } from 'lucide-react';

const allLayers: EntityType[] = ['ecosystem', 'infrastructure', 'institution', 'community', 'economic', 'health'];

type ViewMode = 'canvas' | 'list';

const WorldModel = () => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>([...allLayers]);
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [showCausalTrace, setShowCausalTrace] = useState<string | null>(null);
  const [showOntology, setShowOntology] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showFlowParticles, setShowFlowParticles] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [viewMode]);

  const selectedEntity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) || null : null;

  const toggleLayer = useCallback((layer: string) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  }, []);

  const handleEntitySelect = useCallback((id: string) => {
    setSelectedEntityId(prev => prev === id ? null : id);
    setShowCausalTrace(null);
  }, []);

  const handleTraceCausal = useCallback(() => {
    setShowCausalTrace('drought-cascade');
  }, []);

  const stressedCount = entities.filter(e => e.status === 'stressed' || e.status === 'critical').length;
  const criticalCount = entities.filter(e => e.status === 'critical').length;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-foreground">Atlas World Model</h1>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Living Systems Interface · {entities.length} entities · {stressedCount} under stress
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* System Health Summary */}
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-status-stable" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {entities.filter(e => e.status === 'stable').length} stable
              </span>
            </div>
            <div className="h-3 w-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-status-stressed" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {stressedCount - criticalCount} stressed
              </span>
            </div>
            <div className="h-3 w-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-status-critical" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {criticalCount} critical
              </span>
            </div>
          </div>

          {/* Tool Toggles */}
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/20 p-0.5">
            <button
              onClick={() => setShowOntology(!showOntology)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showOntology ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Ontology Browser"
            >
              <BookOpen className="h-3 w-3" />
              <span className="hidden lg:inline">Ontology</span>
            </button>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showTimeline ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Timeline"
            >
              <Clock className="h-3 w-3" />
              <span className="hidden lg:inline">Timeline</span>
            </button>
            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showScenarios ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Scenarios"
            >
              <Beaker className="h-3 w-3" />
              <span className="hidden lg:inline">Scenarios</span>
            </button>
            <button
              onClick={() => setShowFlowParticles(!showFlowParticles)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showFlowParticles ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Flow Particles"
            >
              <Waves className="h-3 w-3" />
              <span className="hidden lg:inline">Flows</span>
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-border/50 bg-muted/20 p-0.5">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                viewMode === 'canvas' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Network className="h-3 w-3" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                viewMode === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3 w-3" />
              List
            </button>
          </div>
        </div>
      </header>

      {/* Layer Controls */}
      <div className="border-b border-border/30 px-5 py-2.5">
        <LayerToggle activeLayers={activeLayers} onToggle={toggleLayer} />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Ontology Browser */}
        <OntologyBrowser isOpen={showOntology} onClose={() => setShowOntology(false)} />

        {/* Canvas / List */}
        <div className="relative flex-1" ref={canvasRef}>
          {viewMode === 'canvas' ? (
            <div className="world-grid absolute inset-0">
              <WorldCanvas
                width={canvasSize.width}
                height={canvasSize.height}
                selectedEntityId={selectedEntityId}
                onEntitySelect={handleEntitySelect}
                activeLayers={activeLayers}
                hoveredEntityId={hoveredEntityId}
                onEntityHover={setHoveredEntityId}
                showFlowParticles={showFlowParticles}
              />
            </div>
          ) : (
            <EntityList
              selectedEntityId={selectedEntityId}
              onEntitySelect={handleEntitySelect}
              activeLayers={activeLayers}
            />
          )}

          {/* Causal Trace Overlay */}
          <AnimatePresence>
            {showCausalTrace && causalChains[showCausalTrace] && (
              <CausalPathViewer
                steps={causalChains[showCausalTrace]}
                title={showCausalTrace.replace('-', ' ')}
                onClose={() => setShowCausalTrace(null)}
              />
            )}
          </AnimatePresence>

          {/* Scenario Comparison Overlay */}
          <ScenarioComparison isOpen={showScenarios} onClose={() => setShowScenarios(false)} />
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedEntity && (
            <EntityDetailPanel
              entity={selectedEntity}
              onClose={() => setSelectedEntityId(null)}
              onEntitySelect={handleEntitySelect}
              onTraceCausal={handleTraceCausal}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Timeline Scrubber */}
      {showTimeline && (
        <TimelineScrubber
          selectedEntityId={selectedEntityId}
          onEntitySelect={handleEntitySelect}
        />
      )}
    </div>
  );
};

export default WorldModel;
