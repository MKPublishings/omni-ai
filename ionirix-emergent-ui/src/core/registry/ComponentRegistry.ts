import type { ComponentType } from 'react';
import { EnvironmentConfigurator, FlowSummary, WelcomePane } from '@/components/onboarding';
import { CapabilitySelector, StepRenderer } from '@/components/onboarding';
import {
  ActionBarPanel,
  DashboardCommandCenter,
  DashboardWorkspacePanel,
  EditorialCanvas,
  EditorialContextPanel,
  LayoutInspectorPanel,
  SpatialPreviewPanel,
} from '@/components/modules';
import { IonProgress } from '@/components/primitives';
import { ContextRibbon } from '@/components/surfaces';

export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private components = new Map<string, ComponentType<any>>();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }

    return ComponentRegistry.instance;
  }

  register(id: string, component: ComponentType<any>): void {
    this.components.set(id, component);
  }

  resolve(id: string): ComponentType<any> | undefined {
    return this.components.get(id);
  }

  getRegisteredIds(): string[] {
    return Array.from(this.components.keys());
  }

  private registerDefaults(): void {
    this.register('WelcomePane', WelcomePane);
    this.register('CapabilitySelector', CapabilitySelector);
    this.register('EnvironmentConfigurator', EnvironmentConfigurator);
    this.register('FlowSummary', FlowSummary);
    this.register('StepRenderer', StepRenderer);
    this.register('IonProgress', IonProgress);
    this.register('ContextRibbon', ContextRibbon);
    this.register('SpatialPreviewPanel', SpatialPreviewPanel);
    this.register('ActionBarPanel', ActionBarPanel);
    this.register('DashboardCommandCenter', DashboardCommandCenter);
    this.register('LayoutInspectorPanel', LayoutInspectorPanel);
    this.register('DashboardWorkspacePanel', DashboardWorkspacePanel);
    this.register('EditorialCanvas', EditorialCanvas);
    this.register('EditorialContextPanel', EditorialContextPanel);
  }
}