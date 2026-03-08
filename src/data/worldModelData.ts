export type EntityStatus = 'stable' | 'stressed' | 'critical' | 'recovering' | 'uncertain' | 'degraded';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type EntityType = 'ecosystem' | 'infrastructure' | 'institution' | 'community' | 'economic' | 'health';

export interface WorldEntity {
  id: string;
  name: string;
  type: EntityType;
  status: EntityStatus;
  confidence: ConfidenceLevel;
  description: string;
  location?: string;
  metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
  risks: string[];
  dependencies: string[];
  dependents: string[];
  timeline: { date: string; event: string; type: 'info' | 'warning' | 'critical' | 'recovery' }[];
}

export interface WorldRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number; // 0-1
  confidence: ConfidenceLevel;
}

export interface CausalStep {
  id: string;
  label: string;
  status: EntityStatus;
  confidence: ConfidenceLevel;
  detail: string;
}

export const entities: WorldEntity[] = [
  {
    id: 'river-tana',
    name: 'Tana River Basin',
    type: 'ecosystem',
    status: 'stressed',
    confidence: 'high',
    description: 'Major watershed system supplying irrigation, hydropower, and drinking water to 4.5M people across 6 counties.',
    location: 'Eastern Kenya',
    metrics: [
      { label: 'Flow Rate', value: '340 m³/s', trend: 'down' },
      { label: 'Sediment Load', value: '12.4 mg/L', trend: 'up' },
      { label: 'Biodiversity Index', value: '0.67', trend: 'down' },
      { label: 'Riparian Coverage', value: '43%', trend: 'down' },
    ],
    risks: ['Seasonal drought intensifying', 'Upstream deforestation accelerating', 'Industrial pollution hotspots'],
    dependencies: ['rainfall-east', 'forest-upper-tana', 'dam-masinga'],
    dependents: ['irrigation-mwea', 'hydro-kindaruma', 'water-nairobi', 'fisheries-tana-delta'],
    timeline: [
      { date: 'Jan 2025', event: 'Seasonal flow 18% below average', type: 'warning' },
      { date: 'Mar 2025', event: 'Upstream forest loss detected via satellite', type: 'critical' },
      { date: 'Jun 2025', event: 'Dam release optimization implemented', type: 'recovery' },
      { date: 'Sep 2025', event: 'Dry season stress begins early', type: 'warning' },
      { date: 'Dec 2025', event: 'Fish stock survey shows 12% decline', type: 'critical' },
      { date: 'Feb 2026', event: 'Reforestation programme starts upstream', type: 'recovery' },
    ],
  },
  {
    id: 'dam-masinga',
    name: 'Masinga Dam Complex',
    type: 'infrastructure',
    status: 'stable',
    confidence: 'high',
    description: 'Largest reservoir in Kenya. Provides hydropower and flow regulation for downstream agriculture and urban supply.',
    location: 'Embu County',
    metrics: [
      { label: 'Reservoir Level', value: '78%', trend: 'down' },
      { label: 'Power Output', value: '40 MW', trend: 'stable' },
      { label: 'Siltation Rate', value: '2.1M m³/yr', trend: 'up' },
    ],
    risks: ['Siltation reducing capacity', 'Aging infrastructure', 'Climate variability stress'],
    dependencies: ['river-tana', 'rainfall-east'],
    dependents: ['hydro-kindaruma', 'irrigation-mwea', 'water-nairobi'],
    timeline: [
      { date: 'Apr 2025', event: 'Maintenance cycle completed', type: 'info' },
      { date: 'Aug 2025', event: 'Reservoir level drops to 72%', type: 'warning' },
      { date: 'Nov 2025', event: 'Emergency release protocol tested', type: 'info' },
    ],
  },
  {
    id: 'irrigation-mwea',
    name: 'Mwea Irrigation Scheme',
    type: 'economic',
    status: 'stressed',
    confidence: 'medium',
    description: 'Largest rice-growing scheme in East Africa. 30,000+ smallholder farmers depend on Tana water allocation.',
    location: 'Kirinyaga County',
    metrics: [
      { label: 'Rice Yield', value: '4.2 t/ha', trend: 'down' },
      { label: 'Water Allocation', value: '68%', trend: 'down' },
      { label: 'Farmer Income', value: '$1,200/yr', trend: 'down' },
    ],
    risks: ['Water rationing likely', 'Pest pressure increasing', 'Market price volatility'],
    dependencies: ['dam-masinga', 'river-tana'],
    dependents: ['food-nairobi', 'market-rice-east'],
    timeline: [
      { date: 'May 2025', event: 'Water allocation reduced 15%', type: 'warning' },
      { date: 'Jul 2025', event: 'Planting season delayed', type: 'critical' },
      { date: 'Oct 2025', event: 'Partial harvest recovered', type: 'recovery' },
    ],
  },
  {
    id: 'water-nairobi',
    name: 'Nairobi Water Supply',
    type: 'infrastructure',
    status: 'stressed',
    confidence: 'high',
    description: 'Urban water infrastructure serving 5M+ residents. Chronic deficit of 200,000 m³/day. Multiple source dependencies.',
    location: 'Nairobi Metropolitan',
    metrics: [
      { label: 'Daily Deficit', value: '200K m³', trend: 'up' },
      { label: 'Pipe Leakage', value: '38%', trend: 'stable' },
      { label: 'Coverage', value: '72%', trend: 'stable' },
    ],
    risks: ['Supply rationing imminent', 'Infrastructure aging', 'Informal settlement access gap'],
    dependencies: ['dam-masinga', 'river-tana', 'rainfall-east'],
    dependents: ['health-nairobi', 'community-kibera', 'industry-nairobi'],
    timeline: [
      { date: 'Jun 2025', event: 'Rationing schedule expanded', type: 'warning' },
      { date: 'Aug 2025', event: 'Pipe burst in Eastlands', type: 'critical' },
      { date: 'Jan 2026', event: 'Northern collector tunnel phase 1 online', type: 'recovery' },
    ],
  },
  {
    id: 'food-nairobi',
    name: 'Nairobi Food Markets',
    type: 'economic',
    status: 'stressed',
    confidence: 'medium',
    description: 'Wholesale and retail food distribution network. Price-sensitive to transport, agriculture, and import disruptions.',
    location: 'Nairobi',
    metrics: [
      { label: 'Staple Inflation', value: '+14%', trend: 'up' },
      { label: 'Supply Diversity', value: '0.71', trend: 'down' },
      { label: 'Transport Cost Index', value: '128', trend: 'up' },
    ],
    risks: ['Price shock cascading to households', 'Supply chain bottleneck', 'Import dependency growing'],
    dependencies: ['irrigation-mwea', 'transport-corridor'],
    dependents: ['community-kibera', 'health-nairobi'],
    timeline: [
      { date: 'Jul 2025', event: 'Rice prices spike 22%', type: 'critical' },
      { date: 'Sep 2025', event: 'Government price stabilization attempted', type: 'info' },
    ],
  },
  {
    id: 'community-kibera',
    name: 'Kibera Community',
    type: 'community',
    status: 'critical',
    confidence: 'low',
    description: 'Largest informal settlement in East Africa. 250K+ residents. Highly vulnerable to water, food, and health system disruptions.',
    location: 'Nairobi, Kibera',
    metrics: [
      { label: 'Food Security Index', value: '0.38', trend: 'down' },
      { label: 'Water Access', value: '45%', trend: 'down' },
      { label: 'Community Stress', value: 'High', trend: 'up' },
    ],
    risks: ['Food insecurity acute', 'Water-borne disease risk', 'Social unrest probability rising'],
    dependencies: ['water-nairobi', 'food-nairobi', 'health-nairobi'],
    dependents: [],
    timeline: [
      { date: 'Aug 2025', event: 'Water vendor prices double', type: 'critical' },
      { date: 'Oct 2025', event: 'Cholera cases reported', type: 'critical' },
      { date: 'Dec 2025', event: 'Community water kiosk programme launched', type: 'recovery' },
    ],
  },
  {
    id: 'health-nairobi',
    name: 'Nairobi Health System',
    type: 'health',
    status: 'stressed',
    confidence: 'medium',
    description: 'County health infrastructure including 800+ facilities. Under pressure from urban growth, funding gaps, and climate health risks.',
    location: 'Nairobi County',
    metrics: [
      { label: 'Bed Occupancy', value: '92%', trend: 'up' },
      { label: 'Waterborne Cases', value: '+34%', trend: 'up' },
      { label: 'Staff Ratio', value: '1:800', trend: 'stable' },
    ],
    risks: ['Capacity overflow', 'Disease outbreak from water stress', 'Funding shortfall'],
    dependencies: ['water-nairobi', 'gov-health-ministry'],
    dependents: ['community-kibera'],
    timeline: [
      { date: 'Sep 2025', event: 'Emergency bed capacity activated', type: 'warning' },
      { date: 'Nov 2025', event: 'Waterborne disease surge', type: 'critical' },
    ],
  },
  {
    id: 'hydro-kindaruma',
    name: 'Kindaruma Power Station',
    type: 'infrastructure',
    status: 'stable',
    confidence: 'high',
    description: 'Hydroelectric station on Tana River. 72MW capacity. Critical for national grid stability.',
    location: 'Machakos County',
    metrics: [
      { label: 'Output', value: '68 MW', trend: 'stable' },
      { label: 'Capacity Factor', value: '89%', trend: 'stable' },
      { label: 'Water Availability', value: 'Adequate', trend: 'down' },
    ],
    risks: ['Flow reduction risk', 'Grid dependency concentration'],
    dependencies: ['dam-masinga', 'river-tana'],
    dependents: ['grid-national', 'industry-nairobi'],
    timeline: [
      { date: 'Mar 2025', event: 'Turbine maintenance completed', type: 'info' },
      { date: 'Oct 2025', event: 'Flow reduction advisory issued', type: 'warning' },
    ],
  },
  {
    id: 'forest-upper-tana',
    name: 'Upper Tana Forest Reserve',
    type: 'ecosystem',
    status: 'degraded',
    confidence: 'high',
    description: 'Critical water tower ecosystem. Source of Tana River. Under pressure from agricultural encroachment and charcoal production.',
    location: 'Mt. Kenya Region',
    metrics: [
      { label: 'Forest Cover', value: '62%', trend: 'down' },
      { label: 'Deforestation Rate', value: '1.8%/yr', trend: 'up' },
      { label: 'Carbon Stock', value: '145 tC/ha', trend: 'down' },
    ],
    risks: ['Water tower degradation', 'Soil erosion acceleration', 'Biodiversity loss'],
    dependencies: ['gov-forestry', 'rainfall-east'],
    dependents: ['river-tana', 'dam-masinga'],
    timeline: [
      { date: 'Feb 2025', event: 'Satellite shows 340ha loss', type: 'critical' },
      { date: 'Jun 2025', event: 'Community forest guard programme starts', type: 'recovery' },
      { date: 'Jan 2026', event: 'Reforestation targets partially met', type: 'info' },
    ],
  },
  {
    id: 'rainfall-east',
    name: 'Eastern Kenya Rainfall',
    type: 'ecosystem',
    status: 'stressed',
    confidence: 'medium',
    description: 'Regional precipitation patterns. Increasingly variable due to Indian Ocean Dipole shifts and climate change.',
    metrics: [
      { label: 'Annual Rainfall', value: '780mm', trend: 'down' },
      { label: 'Variability', value: 'High', trend: 'up' },
      { label: 'Dry Spell Duration', value: '+12 days', trend: 'up' },
    ],
    risks: ['Extended drought', 'Flash flood alternation', 'Seasonal unpredictability'],
    dependencies: [],
    dependents: ['river-tana', 'forest-upper-tana', 'dam-masinga', 'irrigation-mwea'],
    timeline: [
      { date: 'Apr 2025', event: 'Long rains 25% below normal', type: 'critical' },
      { date: 'Nov 2025', event: 'Short rains onset delayed 3 weeks', type: 'warning' },
    ],
  },
];

export const relationships: WorldRelationship[] = [
  { id: 'r1', source: 'rainfall-east', target: 'river-tana', type: 'supplies water to', strength: 0.9, confidence: 'high' },
  { id: 'r2', source: 'forest-upper-tana', target: 'river-tana', type: 'regulates flow of', strength: 0.8, confidence: 'high' },
  { id: 'r3', source: 'river-tana', target: 'dam-masinga', type: 'feeds into', strength: 0.95, confidence: 'high' },
  { id: 'r4', source: 'dam-masinga', target: 'hydro-kindaruma', type: 'supplies water to', strength: 0.9, confidence: 'high' },
  { id: 'r5', source: 'dam-masinga', target: 'irrigation-mwea', type: 'allocates water to', strength: 0.85, confidence: 'medium' },
  { id: 'r6', source: 'dam-masinga', target: 'water-nairobi', type: 'supplies water to', strength: 0.7, confidence: 'high' },
  { id: 'r7', source: 'irrigation-mwea', target: 'food-nairobi', type: 'supplies food to', strength: 0.75, confidence: 'medium' },
  { id: 'r8', source: 'food-nairobi', target: 'community-kibera', type: 'feeds', strength: 0.8, confidence: 'medium' },
  { id: 'r9', source: 'water-nairobi', target: 'community-kibera', type: 'supplies water to', strength: 0.6, confidence: 'medium' },
  { id: 'r10', source: 'water-nairobi', target: 'health-nairobi', type: 'supports', strength: 0.85, confidence: 'high' },
  { id: 'r11', source: 'health-nairobi', target: 'community-kibera', type: 'serves', strength: 0.7, confidence: 'medium' },
  { id: 'r12', source: 'rainfall-east', target: 'forest-upper-tana', type: 'sustains', strength: 0.7, confidence: 'medium' },
  { id: 'r13', source: 'rainfall-east', target: 'dam-masinga', type: 'replenishes', strength: 0.8, confidence: 'high' },
];

export const causalChains: Record<string, CausalStep[]> = {
  'drought-cascade': [
    { id: 'cs1', label: 'Rainfall Deficit', status: 'critical', confidence: 'high', detail: 'Long rains 25% below normal, dry spells extending +12 days' },
    { id: 'cs2', label: 'River Flow Reduction', status: 'stressed', confidence: 'high', detail: 'Tana Basin flow rate drops to 340 m³/s, seasonal low 18% below average' },
    { id: 'cs3', label: 'Reservoir Drawdown', status: 'stressed', confidence: 'high', detail: 'Masinga Dam level drops to 72%, release optimization required' },
    { id: 'cs4', label: 'Irrigation Rationing', status: 'critical', confidence: 'medium', detail: 'Mwea water allocation reduced 15%, planting season delayed' },
    { id: 'cs5', label: 'Crop Yield Decline', status: 'critical', confidence: 'medium', detail: 'Rice yield drops below 4.2 t/ha, 30K+ farmers impacted' },
    { id: 'cs6', label: 'Food Price Spike', status: 'critical', confidence: 'medium', detail: 'Nairobi staple inflation +14%, rice prices spike 22%' },
    { id: 'cs7', label: 'Household Food Stress', status: 'critical', confidence: 'low', detail: 'Kibera food security index at 0.38, water vendor prices double' },
    { id: 'cs8', label: 'Health System Pressure', status: 'stressed', confidence: 'low', detail: 'Waterborne cases +34%, bed occupancy at 92%' },
  ],
  'deforestation-cascade': [
    { id: 'dc1', label: 'Forest Cover Loss', status: 'degraded', confidence: 'high', detail: 'Upper Tana deforestation at 1.8%/yr, 340ha lost in single quarter' },
    { id: 'dc2', label: 'Soil Erosion Increase', status: 'stressed', confidence: 'high', detail: 'Topsoil loss accelerating, sediment load in river rising' },
    { id: 'dc3', label: 'River Sediment Surge', status: 'stressed', confidence: 'high', detail: 'Sediment load at 12.4 mg/L, turbidity affecting water treatment' },
    { id: 'dc4', label: 'Dam Siltation', status: 'stressed', confidence: 'medium', detail: 'Masinga siltation rate at 2.1M m³/yr, reducing storage capacity' },
    { id: 'dc5', label: 'Water Treatment Costs', status: 'stressed', confidence: 'medium', detail: 'Nairobi NCWSC treatment costs rising, capacity under pressure' },
  ],
};

export const entityTypeConfig: Record<EntityType, { label: string; color: string; icon: string }> = {
  ecosystem: { label: 'Ecosystem', color: 'hsl(155, 65%, 45%)', icon: '🌿' },
  infrastructure: { label: 'Infrastructure', color: 'hsl(200, 70%, 55%)', icon: '🏗️' },
  institution: { label: 'Institution', color: 'hsl(270, 40%, 55%)', icon: '🏛️' },
  community: { label: 'Community', color: 'hsl(35, 90%, 55%)', icon: '👥' },
  economic: { label: 'Economic', color: 'hsl(45, 80%, 50%)', icon: '📊' },
  health: { label: 'Health', color: 'hsl(0, 72%, 55%)', icon: '🏥' },
};

// Node positions for the graph canvas (normalized 0-1)
export const nodePositions: Record<string, { x: number; y: number }> = {
  'rainfall-east': { x: 0.12, y: 0.15 },
  'forest-upper-tana': { x: 0.28, y: 0.1 },
  'river-tana': { x: 0.3, y: 0.35 },
  'dam-masinga': { x: 0.48, y: 0.28 },
  'hydro-kindaruma': { x: 0.65, y: 0.12 },
  'irrigation-mwea': { x: 0.55, y: 0.48 },
  'water-nairobi': { x: 0.68, y: 0.38 },
  'food-nairobi': { x: 0.6, y: 0.65 },
  'health-nairobi': { x: 0.82, y: 0.52 },
  'community-kibera': { x: 0.78, y: 0.78 },
};
