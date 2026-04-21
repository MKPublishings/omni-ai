'use client'

import { GlassCard } from '@/components/GlassCard'
import type { WorkspaceDraft, WorkspaceCapabilityId } from '@/onboarding'
import { WorkspaceConfigurationSection } from '../WorkspaceConfigurationSection'

interface WorkspaceStepProps {
  value: WorkspaceDraft
  errors: string[]
  onChange: (payload: Partial<WorkspaceDraft>) => void
  onToggleCapability: (capability: WorkspaceCapabilityId) => void
}

export function WorkspaceStep({ value, errors, onChange, onToggleCapability }: WorkspaceStepProps) {
  return (
    <GlassCard className="rounded-[2rem] p-6 sm:p-8">
      <WorkspaceConfigurationSection
        value={value}
        errors={errors}
        onChange={onChange}
        onToggleCapability={onToggleCapability}
        eyebrow="Workspace step"
        title="Define the launch shell."
      />
    </GlassCard>
  )
}
