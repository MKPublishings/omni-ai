import { ComponentPropsWithoutRef, ReactNode } from 'react'

type IconProps = ComponentPropsWithoutRef<'svg'>

function BaseIcon({ className, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function AssistantSparkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5l1.1 2.6 2.8.3-2.1 1.9.6 2.7L12 9.7l-2.4 1.3.6-2.7-2.1-1.9 2.8-.3L12 3.5z" />
      <path d="M8.5 13.5c0-1.7 1.6-3 3.5-3s3.5 1.3 3.5 3" />
      <path d="M9.5 18.5h5" />
      <path d="M7.5 18c0-1.9 2-3.5 4.5-3.5s4.5 1.6 4.5 3.5" />
      <path d="M6.5 20.5h11" opacity="0.55" />
    </BaseIcon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5.5L15 12l-7 6.5" />
      <path d="M11 5.5L18 12l-7 6.5" opacity="0.35" />
    </BaseIcon>
  )
}

export function SearchOrbitIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10.5" cy="10.5" r="4.75" />
      <path d="M14.2 14.2L19 19" />
      <path d="M9.2 7.5h2.6" opacity="0.45" />
      <path d="M7.9 10.5h5.2" opacity="0.45" />
    </BaseIcon>
  )
}

export function EventsPulseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="3.5" />
      <path d="M7.5 12h2.2l1.5-2.5 2.2 5 1.6-3H18" />
      <path d="M8 8h8" opacity="0.4" />
    </BaseIcon>
  )
}

export function ToolsStackIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 8.5l6-3 6 3-6 3-6-3z" />
      <path d="M6 12.5l6 3 6-3" />
      <path d="M6 16.5l6 3 6-3" opacity="0.55" />
    </BaseIcon>
  )
}

export function SunGridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.55 5.45L16.7 7.3M7.3 16.7l-1.85 1.85M18.55 18.55L16.7 16.7M7.3 7.3L5.45 5.45" />
    </BaseIcon>
  )
}

export function MoonArcIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14.5 3.6a8.9 8.9 0 101.9 17.6A9.5 9.5 0 0114.5 3.6z" />
      <path d="M17.4 7.2h2.1M18.45 6.15v2.1" opacity="0.55" />
    </BaseIcon>
  )
}

export function LogoutGateIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 4.5H7.5A2.5 2.5 0 005 7v10a2.5 2.5 0 002.5 2.5H10" />
      <path d="M13 8.5L17.5 12 13 15.5" />
      <path d="M9.5 12h8" />
      <path d="M10 4.5h4" opacity="0.35" />
    </BaseIcon>
  )
}

export function PricingPulseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse cx="12" cy="7" rx="4.75" ry="2.5" />
      <path d="M7.25 7v5c0 1.4 2.1 2.5 4.75 2.5s4.75-1.1 4.75-2.5V7" />
      <path d="M9 17.5h6" />
      <path d="M12 14.5v5" />
    </BaseIcon>
  )
}

export function BillingCardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="3" />
      <path d="M3.5 10h17" />
      <path d="M7 14h4" />
      <path d="M14 14h3" opacity="0.45" />
    </BaseIcon>
  )
}

export function OverviewGridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="11" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="17" width="7" height="3" rx="1.5" />
    </BaseIcon>
  )
}

export function AnalyticsWaveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 18.5h16" />
      <path d="M6.5 15V12" />
      <path d="M11 15V8" />
      <path d="M15.5 15v-4" />
      <path d="M6.5 12l4.5-4 4.5 3 2-2" />
    </BaseIcon>
  )
}

export function SimulationOrbitIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4.5c4.4 0 8 3.4 8 7.5s-3.6 7.5-8 7.5-8-3.4-8-7.5 3.6-7.5 8-7.5z" opacity="0.4" />
      <path d="M6.5 8.5l2.2-2.2" />
      <path d="M17.5 15.5l-2.2 2.2" />
      <path d="M8.7 6.3l.1 3-3 .1" />
      <path d="M15.3 17.7l-.1-3 3-.1" />
    </BaseIcon>
  )
}

export function MemoryArchiveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 5.5h8l4 4V18a2 2 0 01-2 2H6a2 2 0 01-2-2V7.5a2 2 0 012-2z" />
      <path d="M14 5.5v4h4" />
      <path d="M8 12h8M8 15.5h5" />
    </BaseIcon>
  )
}

export function ProfileHaloIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8.25" r="3" />
      <path d="M5.5 19c1.5-3.1 4-4.8 6.5-4.8s5 1.7 6.5 4.8" />
      <path d="M8.25 4.25c1-1 2.3-1.5 3.75-1.5s2.75.5 3.75 1.5" opacity="0.45" />
    </BaseIcon>
  )
}

export function SettingsTuneIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4.5v15" />
      <path d="M12 4.5v15" />
      <path d="M18 4.5v15" />
      <circle cx="6" cy="9" r="2" />
      <circle cx="12" cy="14.5" r="2" />
      <circle cx="18" cy="8" r="2" />
    </BaseIcon>
  )
}

export function CloseCrossIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </BaseIcon>
  )
}

export function ExpandCornersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M8 20H4v-4" />
      <path d="M16 20h4v-4" />
      <path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5" opacity="0.45" />
    </BaseIcon>
  )
}

export function ContractCornersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 9H4" />
      <path d="M9 9V4" />
      <path d="M15 9h5" />
      <path d="M15 9V4" />
      <path d="M9 15H4" />
      <path d="M9 15v5" />
      <path d="M15 15h5" />
      <path d="M15 15v5" />
    </BaseIcon>
  )
}

export function SortChevronIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 14.5L12 8l6 6.5" />
      <path d="M6 18.5L12 12l6 6.5" opacity="0.35" />
    </BaseIcon>
  )
}

export function EmptyDataIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 4.5h7l5 5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V6.5a2 2 0 012-2z" />
      <path d="M13 4.5v5h5" />
      <path d="M8 16l2.25-2.25L12.5 16l3.5-4" />
    </BaseIcon>
  )
}

export function InfoBadgeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v4" />
      <circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function SuccessSealIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.5l2 1.1 2.3-.3 1.2 2 2 1.2-.3 2.3 1.1 2-1.1 2 .3 2.3-2 1.2-1.2 2-2.3-.3-2 1.1-2-1.1-2.3.3-1.2-2-2-1.2.3-2.3-1.1-2 1.1-2-.3-2.3 2-1.2 1.2-2 2.3.3 2-1.1z" />
      <path d="M8.5 12.3l2.2 2.2 4.8-5" />
    </BaseIcon>
  )
}

export function WarningHexIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 3.8h6l4.4 4.2v6L15 20.2H9L4.6 16V8L9 3.8z" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r=".8" fill="currentColor" stroke="none" />
    </BaseIcon>
  )
}

export function ErrorBadgeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </BaseIcon>
  )
}

export function TrendUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 15l5-5 3 3 6-6" />
      <path d="M15 7h4v4" />
    </BaseIcon>
  )
}

export function TrendDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 9l5 5 3-3 6 6" />
      <path d="M15 17h4v-4" />
    </BaseIcon>
  )
}

export function TrendFlatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" />
      <path d="M14 9l5 3-5 3" opacity="0.45" />
    </BaseIcon>
  )
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 19V5" />
      <path d="M6.5 10.5L12 5l5.5 5.5" />
    </BaseIcon>
  )
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M6.5 13.5L12 19l5.5-5.5" />
    </BaseIcon>
  )
}