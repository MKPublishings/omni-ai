import { IonButton } from '@/components/primitives';

export interface RibbonAction {
  id: string;
  label: string;
  onClick: () => void;
}

interface ContextRibbonProps {
  actions: RibbonAction[];
  position?: 'top' | 'bottom';
  visible?: boolean;
}

export function ContextRibbon({ actions, position = 'bottom', visible = true }: ContextRibbonProps) {
  if (!visible || actions.length === 0) {
    return null;
  }

  return (
    <div className={`context-ribbon context-ribbon--${position}`.trim()}>
      {actions.map((action) => (
        <IonButton key={action.id} label={action.label} onClick={action.onClick} variant="ghost" />
      ))}
    </div>
  );
}