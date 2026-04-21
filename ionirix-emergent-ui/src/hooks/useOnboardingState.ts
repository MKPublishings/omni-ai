import { useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';
import { onboardingMachine } from '@/core/state';
import { loadOnboardingState, saveOnboardingState } from '@/utils/persistence';

export function useOnboardingState() {
  const [state, send] = useMachine(onboardingMachine);
  const [isHydrating, setIsHydrating] = useState(true);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    const persisted = loadOnboardingState();

    if (!persisted) {
      setIsHydrating(false);
      return;
    }

    if (persisted.currentStep >= 1) {
      send({ type: 'NEXT' });
    }

    if (persisted.currentStep >= 2) {
      send({ type: 'NEXT' });
      send({ type: 'UPDATE_PROFILE', data: persisted.userProfile });
    }

    if (persisted.currentStep >= 3) {
      send({ type: 'NEXT' });
      persisted.selectedCapabilities.forEach((capability) => {
        send({ type: 'SELECT_CAPABILITY', capability });
      });
    }

    if (persisted.currentStep >= 4) {
      send({ type: 'NEXT' });
      send({ type: 'CONFIGURE_ENV', config: persisted.environmentConfig });
    }

    if (persisted.currentStep >= 5) {
      send({ type: 'NEXT' });
      send({ type: 'SET_SPATIAL', prefs: persisted.spatialPreferences });
    }

    if (persisted.currentStep >= 6) {
      send({ type: 'NEXT' });
    }

    setIsHydrating(false);
  }, [send]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    saveOnboardingState(state.context);
  }, [isHydrating, state.context]);

  return { state, send, isHydrating };
}