import type { ButtonHTMLAttributes } from 'react';

interface IonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'primary' | 'ghost';
}

export function IonButton({ label, variant = 'primary', className = '', ...props }: IonButtonProps) {
  return (
    <button className={`ion-button ion-button--${variant} ${className}`.trim()} {...props}>
      {label}
    </button>
  );
}