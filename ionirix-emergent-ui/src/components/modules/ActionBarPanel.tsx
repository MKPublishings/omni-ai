import { IonButton } from '@/components/primitives';

interface ActionBarPanelProps {
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
}

export function ActionBarPanel({ nextLabel, onBack, onNext }: ActionBarPanelProps) {
  return (
    <div className="ion-action-bar action-bar-shell">
      <IonButton label="Back" onClick={onBack} variant="ghost" />
      <IonButton label={nextLabel} onClick={onNext} />
    </div>
  );
}