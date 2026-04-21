'use client'

import { GlassCard } from '@/components/GlassCard'
import type { PreferencesDraft } from '@/onboarding'
import { InterfacePreferencesSection } from '../InterfacePreferencesSection'

interface PreferencesStepProps {
  value: PreferencesDraft
  errors: string[]
  onChange: (payload: Partial<PreferencesDraft>) => void
}

export function PreferencesStep({ value, errors, onChange }: PreferencesStepProps) {
  return (
    <GlassCard className="rounded-[1.9rem] p-5 sm:rounded-[2rem] sm:p-8">
      <InterfacePreferencesSection
        value={value}
        errors={errors}
        onChange={onChange}
        eyebrow="Preferences step"
        title="Tune the shell behavior."
        description="These settings feed the reflow engine directly, so the shell arrangement and motion treatment remain deterministic when the user crosses devices."
      />
    </GlassCard>
  )
}
