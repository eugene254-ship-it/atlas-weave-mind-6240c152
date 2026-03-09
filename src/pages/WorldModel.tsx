import { useState, useRef, useEffect, useCallback } from 'react';
import { entities as baseEntities, causalChains, type EntityType, type WorldRelationship, type ConfidenceLevel } from '@/data/worldModelData';
import { WorldCanvas } from '@/components/world-model/WorldCanvas';
import { GeoMapLayer } from '@/components/world-model/GeoMapLayer';
import { EntityDetailPanel } from '@/components/world-model/EntityDetailPanel';
import { EntityList } from '@/components/world-model/EntityList';
import { CausalPathViewer } from '@/components/world-model/CausalPathViewer';
import { LayerToggle } from '@/components/world-model/LayerToggle';
import { OntologyBrowser } from '@/components/world-model/OntologyBrowser';
import { TimelineScrubber } from '@/components/world-model/TimelineScrubber';
import { ScenarioComparison } from '@/components/world-model/ScenarioComparison';
import { EvidenceDrawer } from '@/components/world-model/EvidenceDrawer';
import { RoleViewSelector, type RoleView } from '@/components/world-model/RoleViewSelector';
import { CrossSystemSearch } from '@/components/world-model/CrossSystemSearch';
import { LiveSignalFeed } from '@/components/world-model/LiveSignalFeed';
import { DependencyGraph } from '@/components/world-model/DependencyGraph';
import { ExportButton } from '@/components/world-model/ExportButton';
import { CriticalAlertSystem } from '@/components/world-model/CriticalAlertSystem';
import { AnnotationPanel, type Annotation } from '@/components/world-model/AnnotationSystem';
import { WhatIfSimulation } from '@/components/world-model/WhatIfSimulation';
import { RiskHeatmap } from '@/components/world-model/RiskHeatmap';
import { ScenarioBranching } from '@/components/world-model/ScenarioBranching';
import { RelationshipEditor } from '@/components/world-model/RelationshipEditor';
import { PresenceIndicators } from '@/components/world-model/PresenceIndicators';
import { useRealtimeSimulation } from '@/hooks/useRealtimeSimulation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AnimatePresence } from 'framer-motion';
import { Globe, List, Network, Activity, BookOpen, Clock, Beaker, Waves, Map, ShieldCheck, GitBranch, MessageSquarePlus, Wand2, Flame, Link2, Split } from 'lucide-react';

const allLayers: EntityType[] = ['ecosystem', 'infrastructure', 'institution', 'community', 'economic', 'health'];

type ViewMode = 'canvas' | 'list' | 'geo';

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
  const [showEvidence, setShowEvidence] = useState(false);
  const [showDepGraph, setShowDepGraph] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showRiskHeatmap, setShowRiskHeatmap] = useState(false);
  const [showBranching, setShowBranching] = useState(false);
  const [showRelEditor, setShowRelEditor] = useState(false);
  const [customRelationships, setCustomRelationships] = useState<(WorldRelationship & { isCustom?: boolean })[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeRole, setActiveRole] = useState<RoleView>('analyst');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const { liveEntities, ticks, isLive, setIsLive } = useRealtimeSimulation(true);

  useKeyboardShortcuts({
    entities: liveEntities,
    activeLayers,
    selectedEntityId,
    onEntitySelect: (id) => { setSelectedEntityId(id); if (!id) setShowCausalTrace(null); },
    viewMode,
    onViewModeChange: setViewMode,
    onToggleSearch: () => {},
  });

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

  const selectedEntity = selectedEntityId ? liveEntities.find(e => e.id === selectedEntityId) || null : null;

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

  const handleShowCausalTrace = useCallback((chainId: string) => {
    setShowCausalTrace(chainId);
  }, []);

  const entityNames = Object.fromEntries(liveEntities.map(e => [e.id, e.name]));

  const handleAddAnnotation = useCallback((ann: Omit<Annotation, 'id' | 'timestamp'>) => {
    setAnnotations(prev => [...prev, { ...ann, id: `ann-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() }]);
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  const stressedCount = liveEntities.filter(e => e.status === 'stressed' || e.status === 'critical').length;
  const criticalCount = liveEntities.filter(e => e.status === 'critical').length;

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
              Living Systems Interface · {liveEntities.length} entities · {stressedCount} under stress
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cross-System Search */}
          <CrossSystemSearch onEntitySelect={handleEntitySelect} onShowCausalTrace={handleShowCausalTrace} />

          {/* System Health Summary */}
          <div className="hidden items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 lg:flex">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-status-stable" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {liveEntities.filter(e => e.status === 'stable').length} stable
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

          {/* Role View Selector */}
          <RoleViewSelector activeRole={activeRole} onRoleChange={setActiveRole} />

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
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showEvidence ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Evidence & Provenance"
            >
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden lg:inline">Evidence</span>
            </button>
            <button
              onClick={() => setShowDepGraph(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              title="Dependency Graph"
            >
              <GitBranch className="h-3 w-3" />
              <span className="hidden lg:inline">Deps</span>
            </button>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showAnnotations ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Annotations"
            >
              <MessageSquarePlus className="h-3 w-3" />
              <span className="hidden lg:inline">Notes</span>
              {annotations.length > 0 && (
                <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary/20 px-1 font-mono text-[8px] text-primary">
                  {annotations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowWhatIf(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              title="What-If Simulation"
            >
              <Wand2 className="h-3 w-3" />
              <span className="hidden lg:inline">What-If</span>
            </button>
            <button
              onClick={() => setShowRiskHeatmap(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              title="Risk Heatmap"
            >
              <Flame className="h-3 w-3" />
              <span className="hidden lg:inline">Risk</span>
            </button>
            <button
              onClick={() => setShowBranching(!showBranching)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showBranching ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Scenario Branching"
            >
              <Split className="h-3 w-3" />
              <span className="hidden lg:inline">Branch</span>
            </button>
            <button
              onClick={() => setShowRelEditor(!showRelEditor)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                showRelEditor ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Relationship Editor"
            >
              <Link2 className="h-3 w-3" />
              <span className="hidden lg:inline">Links</span>
            </button>
            <ExportButton selectedEntityId={selectedEntityId} liveEntities={liveEntities} />
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
              onClick={() => setViewMode('geo')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                viewMode === 'geo' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="h-3 w-3" />
              Map
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

        {/* Canvas / Map / List */}
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
                customRelationships={customRelationships}
                entities={liveEntities}
              />
            </div>
          ) : viewMode === 'geo' ? (
            <div className="absolute inset-0">
              <GeoMapLayer
                selectedEntityId={selectedEntityId}
                onEntitySelect={handleEntitySelect}
                activeLayers={activeLayers}
                hoveredEntityId={hoveredEntityId}
                onEntityHover={setHoveredEntityId}
              />
            </div>
          ) : (
            <EntityList
              selectedEntityId={selectedEntityId}
              onEntitySelect={handleEntitySelect}
              activeLayers={activeLayers}
            />
          )}

          {/* Live Signal Feed */}
          {viewMode !== 'list' && (
            <LiveSignalFeed ticks={ticks} isLive={isLive} onToggle={() => setIsLive(!isLive)} />
          )}

          {/* Presence Indicators */}
          {viewMode !== 'list' && (
            <PresenceIndicators containerRef={canvasRef} selectedEntityId={selectedEntityId} />
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

          {/* Evidence Drawer */}
          <EvidenceDrawer
            entity={selectedEntity}
            isOpen={showEvidence && !!selectedEntity}
            onClose={() => setShowEvidence(false)}
          />
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

      {/* Critical Alert System */}
      <CriticalAlertSystem ticks={ticks} entityNames={entityNames} onEntitySelect={handleEntitySelect} />

      {/* Annotation Panel */}
      <AnnotationPanel
        entityId={selectedEntityId}
        entityName={selectedEntity?.name || ''}
        isOpen={showAnnotations && !!selectedEntityId}
        onClose={() => setShowAnnotations(false)}
        annotations={annotations}
        onAddAnnotation={handleAddAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
      />

      {/* Dependency Graph Modal */}
      <DependencyGraph
        isOpen={showDepGraph}
        onClose={() => setShowDepGraph(false)}
        selectedEntityId={selectedEntityId}
        onEntitySelect={handleEntitySelect}
        liveEntities={liveEntities}
      />

      {/* What-If Simulation Modal */}
      <WhatIfSimulation
        isOpen={showWhatIf}
        onClose={() => setShowWhatIf(false)}
        entities={liveEntities}
      />

      {/* Risk Heatmap Modal */}
      <RiskHeatmap
        isOpen={showRiskHeatmap}
        onClose={() => setShowRiskHeatmap(false)}
        entities={liveEntities}
        onEntitySelect={handleEntitySelect}
      />

      {/* Scenario Branching Modal */}
      <ScenarioBranching
        isOpen={showBranching}
        onClose={() => setShowBranching(false)}
        entities={liveEntities}
        onEntitySelect={handleEntitySelect}
      />

      {/* Relationship Editor Modal */}
      <RelationshipEditor
        isOpen={showRelEditor}
        onClose={() => setShowRelEditor(false)}
        entities={liveEntities}
        selectedEntityId={selectedEntityId}
        onEntitySelect={handleEntitySelect}
        customRelationships={customRelationships}
        onCustomRelationshipsChange={setCustomRelationships}
      />

      {/* Timeline Scrubber */}
      {showTimeline && (
        <TimelineScrubber
          selectedEntityId={selectedEntityId}
          onEntitySelect={handleEntitySelect}
          forks={[
            { id: 'fork-drought', name: 'Severe Drought', forkPoint: 'Jun 2025', color: 'hsl(0, 72%, 55%)' },
            { id: 'fork-reforest', name: 'Reforestation', forkPoint: 'Mar 2025', color: 'hsl(175, 70%, 50%)' },
            { id: 'fork-infra', name: 'Infra Surge', forkPoint: 'Sep 2025', color: 'hsl(270, 60%, 60%)' },
          ]}
        />
      )}
    </div>
  );
};

export default WorldModel;
