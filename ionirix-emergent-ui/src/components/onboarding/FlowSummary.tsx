import type { OnboardingContext } from '@/types';
import { IonButton } from '@/components/primitives';
import { GlassCard } from '@/components/surfaces';

interface FlowSummaryProps {
  context: OnboardingContext;
  onComplete: () => void;
  onEdit: (step: string) => void;
}

export function FlowSummary({ context, onComplete, onEdit }: FlowSummaryProps) {
  return (
    <GlassCard depth={2} glow>
      <div className="pane-header">
        <p className="eyebrow">Flow Summary</p>
        <h2>Review the emergent profile</h2>
      </div>
      <dl className="summary-grid">
        <div>
          <dt>Name</dt>
          <dd>{context.userProfile.name || 'Unspecified'}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{context.userProfile.role || 'Unspecified'}</dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>{context.selectedCapabilities.join(', ') || 'None selected'}</dd>
        </div>
        <div>
          <dt>Density</dt>
          <dd>{context.environmentConfig.density}</dd>
        </div>
      </dl>
      <div className="ion-action-bar">
        <IonButton label="Edit Environment" onClick={() => onEdit('environmentSetup')} variant="ghost" />
        <IonButton label="Complete" onClick={onComplete} />
      </div>
    </GlassCard>
  );
}