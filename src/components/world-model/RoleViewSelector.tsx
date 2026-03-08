import { Briefcase, Microscope, Landmark, Radio } from 'lucide-react';

export type RoleView = 'executive' | 'analyst' | 'policymaker' | 'operator';

interface Props {
  activeRole: RoleView;
  onRoleChange: (role: RoleView) => void;
}

const roles: { id: RoleView; label: string; icon: typeof Briefcase; description: string }[] = [
  { id: 'executive', label: 'Executive', icon: Briefcase, description: 'System health summary' },
  { id: 'analyst', label: 'Analyst', icon: Microscope, description: 'Evidence deep-dive' },
  { id: 'policymaker', label: 'Policy', icon: Landmark, description: 'Consequence focus' },
  { id: 'operator', label: 'Operator', icon: Radio, description: 'Live signals' },
];

export function RoleViewSelector({ activeRole, onRoleChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-0.5">
      {roles.map(role => {
        const Icon = role.icon;
        const isActive = activeRole === role.id;
        return (
          <button
            key={role.id}
            onClick={() => onRoleChange(role.id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={role.description}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden xl:inline">{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Role-specific entity filtering and display logic
export function getRoleConfig(role: RoleView) {
  switch (role) {
    case 'executive':
      return {
        showMetrics: true,
        showEvidence: false,
        showCausalTrace: false,
        showTimeline: false,
        showRisks: true,
        entitySort: (a: { status: string }, b: { status: string }) => {
          const order = { critical: 0, stressed: 1, degraded: 2, recovering: 3, uncertain: 4, stable: 5 };
          return (order[a.status as keyof typeof order] ?? 5) - (order[b.status as keyof typeof order] ?? 5);
        },
        summaryLabel: 'System Health Overview',
      };
    case 'analyst':
      return {
        showMetrics: true,
        showEvidence: true,
        showCausalTrace: true,
        showTimeline: true,
        showRisks: true,
        entitySort: undefined,
        summaryLabel: 'Evidence & Analysis',
      };
    case 'policymaker':
      return {
        showMetrics: false,
        showEvidence: false,
        showCausalTrace: true,
        showTimeline: true,
        showRisks: true,
        entitySort: undefined,
        summaryLabel: 'Consequences & Interventions',
      };
    case 'operator':
      return {
        showMetrics: true,
        showEvidence: false,
        showCausalTrace: false,
        showTimeline: true,
        showRisks: true,
        entitySort: (a: { timeline: unknown[] }, b: { timeline: unknown[] }) => b.timeline.length - a.timeline.length,
        summaryLabel: 'Live Signal Monitor',
      };
  }
}
