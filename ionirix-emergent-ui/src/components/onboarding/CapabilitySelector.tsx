import type { Capability } from '@/types';
import { GlassCard } from '@/components/surfaces';

interface CapabilitySelectorProps {
  capabilities: Capability[];
  selected: string[];
  onToggle: (id: string) => void;
}

export function CapabilitySelector({ capabilities, selected, onToggle }: CapabilitySelectorProps) {
  return (
    <div className="capability-grid">
      {capabilities.map((capability) => {
        const active = selected.includes(capability.id);
        return (
          <button key={capability.id} className="capability-card-button" onClick={() => onToggle(capability.id)} type="button">
            <GlassCard className={active ? 'is-selected' : ''} depth={active ? 3 : 1} glow={active} interactive>
              <h3>{capability.label}</h3>
              <p>{capability.description}</p>
            </GlassCard>
          </button>
        );
      })}
    </div>
  );
}