import type { ReactNode } from 'react';
import type { ResolvedLayout } from '@/types';

interface EmergentGridProps {
  layout: ResolvedLayout;
  children: ReactNode;
}

export function EmergentGrid({ layout, children }: EmergentGridProps) {
  return (
    <div
      className="emergent-grid"
      style={{
        gridTemplateColumns: layout.grid.columns,
        gridTemplateRows: layout.grid.rows,
        gridTemplateAreas: layout.grid.areas.map((area) => `"${area}"`).join(' '),
        gap: layout.grid.gap,
      }}
    >
      {children}
    </div>
  );
}