import type { InputHTMLAttributes } from 'react';

interface IonInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function IonInput({ label, className = '', id, ...props }: IonInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className="ion-field" htmlFor={inputId}>
      <span>{label}</span>
      <input className={`ion-input ${className}`.trim()} id={inputId} {...props} />
    </label>
  );
}