import editorialSchema from '@/core/schema/defaults/editorial.schema.json';
import type { LayoutSchema } from '@/types';
import { SchemaSurfaceShell } from './SchemaSurfaceShell';

export function EditorialShell() {
  return (
    <SchemaSurfaceShell
      schemaInput={editorialSchema as LayoutSchema}
      eyebrow="Editorial Surface"
      title="Ionirix Editorial Shell"
      description="First-class runnable editorial surface backed by the Emergent-UI schema and registry modules."
    />
  );
}