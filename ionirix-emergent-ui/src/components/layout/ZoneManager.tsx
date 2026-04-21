import type { ReactNode } from 'react';

interface ZoneManagerProps {
  children: ReactNode;
}

export function ZoneManager({ children }: ZoneManagerProps) {
  return <div className="zone-manager">{children}</div>;
}