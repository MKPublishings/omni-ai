import { LayoutGroup, motion } from 'framer-motion';
import { useEffect, useSyncExternalStore } from 'react';
import { ReflowContainer, EmergentGrid, ZoneManager, ZonePresence } from '@/components/layout';
import { AdaptiveSurface, GlassCard } from '@/components/surfaces';
import { reflowEngine } from '@/core/engine';
import { ComponentRegistry } from '@/core/registry';
import { useLayoutSchema } from '@/hooks/useLayoutSchema';
import { getViewportContext } from '@/utils/spatial';
import type { LayoutSchema } from '@/types';

interface SchemaSurfaceShellProps {
  schemaInput: LayoutSchema;
  title: string;
  eyebrow: string;
  description: string;
}

export function SchemaSurfaceShell({ schemaInput, title, eyebrow, description }: SchemaSurfaceShellProps) {
  const { schema } = useLayoutSchema(schemaInput);

  useEffect(() => {
    reflowEngine.initialize(schema);
    reflowEngine.setCurrentState(schema.surface.id);
    reflowEngine.setViewport(getViewportContext());

    const runReflow = (source: string) => {
      const result = reflowEngine.requestReflow({
        source,
        type: 'viewport',
        timestamp: Date.now(),
      });
      reflowEngine.commit(result.layout);
    };

    runReflow(`${schema.surface.id}:mount`);

    const onResize = () => {
      reflowEngine.setViewport(getViewportContext());
      runReflow(`${schema.surface.id}:resize`);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [schema]);

  const resolvedLayout = useSyncExternalStore(
    (callback) => reflowEngine.subscribe(callback),
    () => reflowEngine.getCurrentLayout(),
    () => reflowEngine.getCurrentLayout(),
  );
  const registry = ComponentRegistry.getInstance();

  return (
    <LayoutGroup id={schema.surface.id}>
      <section className="workspace-shell">
      <motion.header className="workspace-header" layout>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="workspace-copy">{description}</p>
        </div>
      </motion.header>
      {!resolvedLayout ? <div className="workspace-copy">Preparing {title}...</div> : null}
      <ReflowContainer>
        {resolvedLayout ? <EmergentGrid layout={resolvedLayout}>
          <ZoneManager>
            {schema.surface.zones.map((zone) => {
              const Component = registry.resolve(zone.component);
              const surfaceProps = zone.priority === undefined ? { zoneId: zone.id } : { zoneId: zone.id, priority: zone.priority };

              return (
                <ZonePresence key={zone.id} zoneId={zone.id}>
                  <AdaptiveSurface {...surfaceProps}>
                    {Component ? (
                      <Component />
                    ) : (
                      <GlassCard className="ion-placeholder-panel" depth={1}>
                        <h3>{zone.id}</h3>
                        <p>Missing registry component: {zone.component}</p>
                      </GlassCard>
                    )}
                  </AdaptiveSurface>
                </ZonePresence>
              );
            })}
          </ZoneManager>
        </EmergentGrid> : null}
      </ReflowContainer>
    </section>
    </LayoutGroup>
  );
}