import type { ComponentType } from 'react';
import type { Capability, OnboardingContext, OnboardingEvent, StepSchema } from '@/types';
import { ComponentRegistry } from '@/core/registry';

interface StepRendererProps {
  stepConfig: StepSchema;
  context: OnboardingContext;
  onEvent: (event: OnboardingEvent) => void;
}

const defaultCapabilities: Capability[] = [
  { id: 'ai', label: 'AI Systems', description: 'Agentic reasoning and model orchestration.' },
  { id: 'analytics', label: 'Analytics', description: 'Insight surfaces and evaluation loops.' },
  { id: 'spatial', label: 'Spatial UI', description: 'Emergent layouts and spatial intelligence.' },
  { id: 'automation', label: 'Automation', description: 'Workflows, registries, and runtime actions.' },
];

export function StepRenderer({ stepConfig, context, onEvent }: StepRendererProps) {
  const registry = ComponentRegistry.getInstance();
  const Component = registry.resolve(stepConfig.component) as ComponentType<Record<string, unknown>> | undefined;

  if (!Component) {
    return <div className="ion-placeholder-panel">Unregistered step component: {stepConfig.component}</div>;
  }

  if (stepConfig.id === 'welcome') {
    return <Component onNext={() => onEvent({ type: 'NEXT' })} onSkip={() => onEvent({ type: 'SKIP' })} />;
  }

  if (stepConfig.id === 'profiling') {
    return (
      <Component
        mode="profiling"
        onNext={() => onEvent({ type: 'NEXT' })}
        onProfileChange={(data: Partial<OnboardingContext['userProfile']>) => onEvent({ type: 'UPDATE_PROFILE', data })}
        profile={context.userProfile}
      />
    );
  }

  if (stepConfig.id === 'capabilitySelection') {
    return (
      <Component
        capabilities={defaultCapabilities}
        onToggle={(capabilityId: string) =>
          onEvent(
            context.selectedCapabilities.includes(capabilityId)
              ? { type: 'REMOVE_CAPABILITY', capability: capabilityId }
              : { type: 'SELECT_CAPABILITY', capability: capabilityId },
          )
        }
        selected={context.selectedCapabilities}
      />
    );
  }

  if (stepConfig.id === 'environmentSetup') {
    return (
      <Component
        config={context.environmentConfig}
        onChange={(config: Partial<OnboardingContext['environmentConfig']>) => onEvent({ type: 'CONFIGURE_ENV', config })}
      />
    );
  }

  if (stepConfig.id === 'summary') {
    return (
      <Component
        context={context}
        onComplete={() => onEvent({ type: 'COMPLETE' })}
        onEdit={(step: string) => {
          if (step === 'environmentSetup') {
            onEvent({ type: 'BACK' });
          }
        }}
      />
    );
  }

  return <Component />;
}