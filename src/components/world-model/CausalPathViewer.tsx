import { type CausalStep } from '@/data/worldModelData';
import { SystemStateBadge, ConfidenceIndicator } from './SystemStateBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

interface Props {
  steps: CausalStep[];
  title: string;
  onClose: () => void;
}

export function CausalPathViewer({ steps, title, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="absolute bottom-4 left-4 right-4 z-30 rounded-xl border border-border/50 bg-card/95 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Causal Trace</h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{title}</span>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex w-[180px] shrink-0 flex-col rounded-lg border border-border/40 bg-muted/30 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">Step {i + 1}</span>
                <SystemStateBadge status={step.status} />
              </div>
              <h4 className="mb-1.5 font-display text-xs font-semibold text-foreground">{step.label}</h4>
              <p className="mb-2 text-[10px] leading-relaxed text-muted-foreground">{step.detail}</p>
              <ConfidenceIndicator level={step.confidence} />
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex shrink-0 items-center px-1 pt-8">
                <ChevronRight className="h-4 w-4 text-primary/40" />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
