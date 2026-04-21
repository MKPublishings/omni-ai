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
    <GlassCard className="rounded-[1.9rem] p-5 sm:rounded-[2rem] sm:p-8 lg:p-9">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:gap-6">
        <div className="min-w-0 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spectral-cyan-300">Account step</p>
          <h2 className="mt-3 text-[1.9rem] font-semibold text-quantum-white sm:text-3xl">Provision the identity surface.</h2>
          <p className="mt-4 text-sm leading-6 text-quantum-white/68 sm:hidden">
            Finish the account details needed to open the workspace.
          </p>
          <p className="mt-4 hidden text-sm leading-7 text-quantum-white/68 sm:block">
            The onboarding state machine will not move forward until the account fields satisfy the same constraints enforced by the Worker signup endpoint.
          </p>

          <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 text-sm leading-6 text-quantum-white/64 sm:p-5">
            <p className="font-semibold text-quantum-white">Identity rules</p>
            <p className="mt-2 sm:hidden">Use the final display name, username, and email for this account.</p>
            <p className="mt-2 hidden sm:block">Use the same account boundary that will persist into the live dashboard. Display name, username, and email should be production-ready before you move forward.</p>
          </div>

          <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 text-sm leading-6 text-quantum-white/64 sm:p-5">
            <p className="font-semibold text-quantum-white">Password policy</p>
            <p className="mt-2">{PASSWORD_REQUIREMENTS}</p>
          </div>
        </div>

        <div className="min-w-0 grid gap-4">
          <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
            <p className="text-sm font-semibold text-quantum-white">Identity details</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quantum-white/44">Display name</label>
                <Input value={value.displayName} onChange={(event) => onChange({ displayName: event.target.value })} placeholder="Display name" className="mt-3 h-12 rounded-2xl px-4" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quantum-white/44">Username</label>
                <Input value={value.username} onChange={(event) => onChange({ username: event.target.value.toLowerCase() })} placeholder="Username" className="mt-3 h-12 rounded-2xl px-4" autoCapitalize="none" autoCorrect="off" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quantum-white/44">Email address</label>
                <Input value={value.email} onChange={(event) => onChange({ email: event.target.value.trim() })} placeholder="Email address" type="email" className="mt-3 h-12 rounded-2xl px-4" autoCapitalize="none" autoCorrect="off" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-quantum-white/10 bg-black/10 p-4 sm:p-5">
            <p className="text-sm font-semibold text-quantum-white">Credential lock</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quantum-white/44">Password</label>
                <Input value={value.password} onChange={(event) => onChange({ password: event.target.value })} placeholder="Password" type="password" className="mt-3 h-12 rounded-2xl px-4" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-quantum-white/44">Confirm password</label>
                <Input value={value.confirmPassword} onChange={(event) => onChange({ confirmPassword: event.target.value })} placeholder="Confirm password" type="password" className="mt-3 h-12 rounded-2xl px-4" />
              </div>
            </div>
          </div>
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
