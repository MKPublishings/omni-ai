import type { UserProfile } from '@/types';
import { IonButton, IonInput } from '@/components/primitives';
import { GlassCard } from '@/components/surfaces';

interface WelcomePaneProps {
  mode?: 'welcome' | 'profiling';
  profile?: UserProfile;
  onNext: () => void;
  onSkip?: () => void;
  onProfileChange?: (profile: Partial<UserProfile>) => void;
}

export function WelcomePane({
  mode = 'welcome',
  profile,
  onNext,
  onSkip,
  onProfileChange,
}: WelcomePaneProps) {
  if (mode === 'profiling') {
    return (
      <GlassCard depth={2} glow>
        <div className="pane-header">
          <p className="eyebrow">Profile Calibration</p>
          <h2>Shape the onboarding path</h2>
        </div>
        <div className="pane-grid">
          <IonInput
            label="Name"
            value={profile?.name ?? ''}
            onChange={(event) => onProfileChange?.({ name: event.currentTarget.value })}
          />
          <IonInput
            label="Role"
            value={profile?.role ?? ''}
            onChange={(event) => onProfileChange?.({ role: event.currentTarget.value })}
          />
          <label className="ion-field">
            <span>Experience</span>
            <select
              className="ion-input"
              value={profile?.experience ?? ''}
              onChange={(event) =>
                onProfileChange?.({ experience: event.currentTarget.value as UserProfile['experience'] })
              }
            >
              <option value="">Choose a level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>
        <div className="ion-action-bar">
          <IonButton label="Continue" onClick={onNext} />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="welcome-pane" depth={3} glow>
      <p className="eyebrow">Ionirix Emergent-UI</p>
      <h1>Onboarding that grows around the user.</h1>
      <p>
        This scaffold follows the workspace plan exactly: adaptive zones, JSON-driven layout, event-driven reflow,
        and behavior-led emergence.
      </p>
      <div className="ion-action-bar">
        <IonButton label="Begin" onClick={onNext} />
        {onSkip ? <IonButton label="Skip Ahead" onClick={onSkip} variant="ghost" /> : null}
      </div>
    </GlassCard>
  );
}