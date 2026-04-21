interface IonToggleProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function IonToggle({ checked, label, onChange }: IonToggleProps) {
  return (
    <label className="ion-toggle">
      <span>{label}</span>
      <button
        aria-pressed={checked}
        className={`ion-toggle__track ${checked ? 'is-active' : ''}`.trim()}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span className="ion-toggle__thumb" />
      </button>
    </label>
  );
}