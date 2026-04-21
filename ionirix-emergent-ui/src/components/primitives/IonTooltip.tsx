import type { ReactNode } from 'react';

interface IonTooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function IonTooltip({ content, children }: IonTooltipProps) {
  return (
    <span className="ion-tooltip">
      {children}
      <span className="ion-tooltip__content">{content}</span>
    </span>
  );
}