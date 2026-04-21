interface IonProgressProps {
  current: number;
  total: number;
}

export function IonProgress({ current, total }: IonProgressProps) {
  const clamped = total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="ion-progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="ion-progress__track">
        <div className="ion-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      <span className="ion-progress__label">
        {current}/{total}
      </span>
    </div>
  );
}