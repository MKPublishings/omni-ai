import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import onboardingSchema from '@/core/schema/defaults/onboarding.schema.json';
import { eventBus, ReflowHandler } from '@/core/events';
import { reflowEngine } from '@/core/engine';
import { registerDefaultBehaviors, BehaviorRegistry } from '@/core/registry';
import { EmergentGrid, ReflowContainer, ZoneManager, ZonePresence } from '@/components/layout';
import { ActionBarPanel, SpatialPreviewPanel } from '@/components/modules';
import { IonButton, IonProgress } from '@/components/primitives';
import { AdaptiveSurface, ContextRibbon, FloatingPanel, GlassCard } from '@/components/surfaces';
import { useBehavior } from '@/hooks/useBehavior';
import { useLayoutSchema } from '@/hooks/useLayoutSchema';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useSpatialContext } from '@/hooks/useSpatialContext';
import { getViewportContext } from '@/utils/spatial';
import type { LayoutSchema } from '@/types';
import { StepRenderer } from './StepRenderer';

const stepOrder = ['welcome', 'profiling', 'capabilitySelection', 'environmentSetup', 'summary'] as const;

export function OnboardingShell() {
  const { schema } = useLayoutSchema(onboardingSchema as LayoutSchema);
  const { state, send, isHydrating } = useOnboardingState();
  const currentStateValue = String(state.value);
  const registryRef = useRef<BehaviorRegistry | null>(null);
  const reflowHandlerRef = useRef<ReflowHandler | null>(null);
  const previousStateValueRef = useRef(currentStateValue);
  const spatialContext = useSpatialContext();
  const activeBehaviors = useBehavior({
    includeIds: (schema.behaviors ?? [])
      .filter((binding) => binding.target === 'context-panel' || binding.target === 'step-content' || binding.target === '*')
      .map((binding) => binding.action),
  });

  const recordSurfaceInteraction = (zoneId: string, action: 'click' | 'focus' | 'hover' | 'scroll' | 'drag', source: string) => {
    reflowEngine.setFocusedZone(zoneId);
    reflowEngine.recordInteraction(`${zoneId}:${source}`);
    eventBus.emit('INTERACTION', {
      zoneId,
      action,
      position: { x: 0, y: 0 },
      timestamp: Date.now(),
    });
    eventBus.emit('REFLOW_REQUEST', {
      trigger: 'interaction',
      source,
      priority: 'deferred',
    });
  };

  useEffect(() => {
    registryRef.current = registerDefaultBehaviors(BehaviorRegistry.getInstance());
    reflowHandlerRef.current = new ReflowHandler(eventBus, reflowEngine, registryRef.current);

    reflowEngine.initialize(schema);
    reflowEngine.setViewport(getViewportContext());
    eventBus.emit('REFLOW_REQUEST', {
      trigger: 'viewport',
      source: 'OnboardingShell.mount',
      priority: 'immediate',
    });

    const onResize = () => {
      reflowEngine.setViewport(getViewportContext());
      eventBus.emit('REFLOW_REQUEST', {
        trigger: 'viewport',
        source: 'window.resize',
        priority: 'deferred',
      });
    };

    if (!isHydrating && currentStateValue === 'idle') {
      send({ type: 'NEXT' });
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      reflowHandlerRef.current?.dispose();
    };
  }, [currentStateValue, isHydrating, schema, send]);

  useEffect(() => {
    const previousStateValue = previousStateValueRef.current;
    reflowEngine.setCurrentState(currentStateValue);
    reflowEngine.setFocusedZone('step-content');

    if (previousStateValue !== currentStateValue) {
      eventBus.emit('STATE_TRANSITION', {
        machine: 'onboarding',
        from: previousStateValue,
        to: currentStateValue,
        event: 'STATE_CHANGE',
      });
      reflowEngine.recordInteraction(`state:${currentStateValue}`);
      eventBus.emit('REFLOW_REQUEST', {
        trigger: 'state-change',
        source: `onboarding:${currentStateValue}`,
        priority: 'deferred',
      });
      previousStateValueRef.current = currentStateValue;
    }
  }, [currentStateValue]);

  const resolvedLayout = reflowEngine.getCurrentLayout();
  const activeStep = useMemo(() => {
    return schema.steps?.find((step: { id: string }) => step.id === currentStateValue) ?? schema.steps?.[0];
  }, [currentStateValue, schema.steps]);
  const currentIndex = Math.max(1, stepOrder.indexOf((activeStep?.id as (typeof stepOrder)[number]) ?? 'welcome') + 1);
  const calibration = reflowEngine.createSpatialCalibration();
  const ribbonActions = activeBehaviors.map((behavior) => ({
    id: behavior.id,
    label:
      behavior.id === 'adaptive-reveal'
        ? 'Reveal more'
        : behavior.id === 'progressive-disclosure'
          ? 'Open advanced'
          : behavior.id === 'contextual-elevation'
            ? 'Focus active zone'
            : behavior.id === 'spatial-collapse'
              ? 'Rebalance layout'
              : behavior.name,
    onClick: () => recordSurfaceInteraction('context-panel', 'click', `behavior:${behavior.id}`),
  }));
  const showAssistPanel = activeBehaviors.some((behavior) => ['adaptive-reveal', 'progressive-disclosure'].includes(behavior.id));

  const handleCalibration = (prefs: LayoutSchema extends never ? never : typeof state.context.spatialPreferences) => {
    recordSurfaceInteraction('spatial-preview', 'drag', 'spatial:calibrate');
    send({ type: 'CALIBRATE' });
    send({ type: 'SET_SPATIAL', prefs });
  };

  const handleBack = () => {
    recordSurfaceInteraction('action-bar', 'click', 'nav:back');
    send({ type: 'BACK' });
  };

  const handleNext = () => {
    recordSurfaceInteraction('action-bar', 'click', currentStateValue === 'summary' ? 'nav:complete' : 'nav:next');
    send({ type: currentStateValue === 'summary' ? 'COMPLETE' : 'NEXT' });
  };

  if (!resolvedLayout || !activeStep) {
    return <div className="workspace-shell">Initializing Emergent-UI scaffold...</div>;
  }

  return (
    <LayoutGroup id="onboarding-surface">
    <main className="workspace-shell">
      <motion.header className="workspace-header" layout>
        <div>
          <p className="eyebrow">Emergent-UI Onboarding Architecture</p>
          <h1>Ionirix Workspace Scaffold</h1>
        </div>
        <IonButton label="Reset Flow" onClick={() => window.location.reload()} variant="ghost" />
      </motion.header>
      <ReflowContainer>
        <EmergentGrid layout={resolvedLayout}>
          <ZoneManager>
            <ZonePresence zoneId="progress-rail">
              <AdaptiveSurface zoneId="progress-rail" priority={100}>
                <GlassCard depth={2} className="progress-rail">
                  <IonProgress current={currentIndex} total={schema.steps?.length ?? 5} />
                  <ol className="step-list">
                    {(schema.steps ?? []).map((step: { id: string; title: string }, index: number) => (
                      <li key={step.id} className={index + 1 === currentIndex ? 'is-active' : ''}>
                        <span>{index + 1}</span>
                        <strong>{step.title}</strong>
                      </li>
                    ))}
                  </ol>
                </GlassCard>
              </AdaptiveSurface>
            </ZonePresence>
            <ZonePresence zoneId="step-content">
              <AdaptiveSurface zoneId="step-content" priority={95}>
              <div onMouseEnter={() => recordSurfaceInteraction('step-content', 'focus', 'step:focus')}>
                <StepRenderer context={state.context} onEvent={send} stepConfig={activeStep} />
              </div>
              </AdaptiveSurface>
            </ZonePresence>
            <ZonePresence zoneId="context-panel">
              <AdaptiveSurface zoneId="context-panel" priority={60}>
                <ContextRibbon actions={ribbonActions} visible={ribbonActions.length > 0} />
              </AdaptiveSurface>
            </ZonePresence>
            <ZonePresence zoneId="spatial-preview">
              <AdaptiveSurface zoneId="spatial-preview" priority={40}>
                <SpatialPreviewPanel
                  calibration={state.context.spatialPreferences.zoneCount > 0 ? state.context.spatialPreferences : calibration}
                  onCalibrate={handleCalibration}
                  recommendation={calibration}
                  surfaceId="onboarding"
                  machineState={currentStateValue}
                  currentStep={state.context.currentStep}
                  selectedCapabilities={state.context.selectedCapabilities}
                  {...(schema.surface.replayTargetSurface ? { targetSurface: schema.surface.replayTargetSurface } : {})}
                  {...(schema.surface.replayTargetSurfaces ? { availableTargetSurfaces: schema.surface.replayTargetSurfaces } : {})}
                />
              </AdaptiveSurface>
            </ZonePresence>
            <ZonePresence zoneId="action-bar">
              <AdaptiveSurface zoneId="action-bar" priority={90}>
                <ActionBarPanel nextLabel={currentStateValue === 'summary' ? 'Complete' : 'Next'} onBack={handleBack} onNext={handleNext} />
              </AdaptiveSurface>
            </ZonePresence>
          </ZoneManager>
        </EmergentGrid>
      </ReflowContainer>
      <AnimatePresence>
      {showAssistPanel ? (
        <FloatingPanel avoidZones={['context-panel']} preferredPosition="right" targetZone="step-content">
          <p className="eyebrow">Emergent Assist</p>
          <h3>{activeBehaviors[0]?.name ?? 'Context Assist'}</h3>
          <p>
            {activeBehaviors[0]?.description ?? 'Adaptive behaviors are active on this surface.'}
          </p>
          <p className="floating-panel__meta">
            Balance: {spatialContext ? `${spatialContext.balance.horizontal}/${spatialContext.balance.vertical}` : 'pending'}
          </p>
        </FloatingPanel>
      ) : null}
      </AnimatePresence>
    </main>
    </LayoutGroup>
  );
}