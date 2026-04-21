import dashboardSchema from '@/core/schema/defaults/dashboard.schema.json';
import type { LayoutSchema } from '@/types';
import { SchemaSurfaceShell } from './SchemaSurfaceShell';

export function DashboardShell() {
  return (
    <SchemaSurfaceShell
      schemaInput={dashboardSchema as LayoutSchema}
      eyebrow="Dashboard Surface"
      title="Ionirix Dashboard Shell"
      description="First-class runnable dashboard surface backed by the Emergent-UI schema and registry modules."
    />
  );
}