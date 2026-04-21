import type { EnvironmentConfig } from '@/types';
import { IonToggle } from '@/components/primitives';
import { GlassCard } from '@/components/surfaces';

interface EnvironmentConfiguratorProps {
  config: EnvironmentConfig;
  onChange: (config: Partial<EnvironmentConfig>) => void;
}

export function EnvironmentConfigurator({ config, onChange }: EnvironmentConfiguratorProps) {
  return (
    <GlassCard depth={2} className="environment-configurator">
      <div className="pane-header">
        <p className="eyebrow">Environment Setup</p>
        <h2>Calibrate density and motion</h2>
      </div>
      <div className="stack-gap">
        <label className="ion-field">
          <span>Theme</span>
          <select className="ion-input" value={config.theme} onChange={(event) => onChange({ theme: event.currentTarget.value as EnvironmentConfig['theme'] })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </label>
        <label className="ion-field">
          <span>Density</span>
          <select className="ion-input" value={config.density} onChange={(event) => onChange({ density: event.currentTarget.value as EnvironmentConfig['density'] })}>
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
        <IonToggle
          checked={config.motionPreference === 'full'}
          label="Full motion"
          onChange={(checked) => onChange({ motionPreference: checked ? 'full' : 'reduced' })}
        />
      </div>
    </GlassCard>
  );
}