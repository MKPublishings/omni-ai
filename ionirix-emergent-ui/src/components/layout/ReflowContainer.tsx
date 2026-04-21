import type { ReactNode } from 'react';

interface ReflowContainerProps {
  children: ReactNode;
}

export function ReflowContainer({ children }: ReflowContainerProps) {
  return <div className="reflow-container">{children}</div>;
}