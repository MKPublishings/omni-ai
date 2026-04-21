'use client'

import { GlassCard } from '@/components/GlassCard'
import { Input } from '@/components/Input'
import { PASSWORD_REQUIREMENTS } from '@/onboarding'
import type { AccountDraft } from '@/onboarding'

interface AccountStepProps {
  value: AccountDraft
  errors: string[]
  onChange: (payload: Partial<AccountDraft>) => void
}

export function AccountStep({ value, errors, onChange }: AccountStepProps) {
  return (
    <GlassCard className="rounded-[2rem] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Account step</p>
          <h2 className="mt-3 text-3xl font-semibold text-quantum-white">Provision the identity surface.</h2>
          <p className="mt-4 text-sm leading-7 text-quantum-white/68">
            The onboarding state machine will not move forward until the account fields satisfy the same constraints enforced by the Worker signup endpoint.
          </p>
          <div className="mt-6 rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4 text-sm leading-6 text-quantum-white/64">
            <p className="font-semibold text-quantum-white">Password policy</p>
            <p className="mt-2">{PASSWORD_REQUIREMENTS}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <Input value={value.displayName} onChange={(event) => onChange({ displayName: event.target.value })} placeholder="Display name" className="h-12 rounded-2xl px-4" />
          <Input value={value.username} onChange={(event) => onChange({ username: event.target.value.toLowerCase() })} placeholder="Username" className="h-12 rounded-2xl px-4" autoCapitalize="none" autoCorrect="off" />
          <Input value={value.email} onChange={(event) => onChange({ email: event.target.value.trim() })} placeholder="Email address" type="email" className="h-12 rounded-2xl px-4" autoCapitalize="none" autoCorrect="off" />
          <Input value={value.password} onChange={(event) => onChange({ password: event.target.value })} placeholder="Password" type="password" className="h-12 rounded-2xl px-4" />
          <Input value={value.confirmPassword} onChange={(event) => onChange({ confirmPassword: event.target.value })} placeholder="Confirm password" type="password" className="h-12 rounded-2xl px-4" />
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-amber-signal-500/24 bg-amber-signal-500/10 p-4">
          <ul className="space-y-2 text-sm leading-6 text-amber-signal-200">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </GlassCard>
  )
}
