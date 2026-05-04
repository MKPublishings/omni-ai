'use client'

import Link from 'next/link'
import { useSiteAuthState } from '@/lib/site-auth'

export function PublicAuthControls() {
  const { hasWorkspaceSession, isSiteAuthenticated, sessionUser, signOut } = useSiteAuthState()

  const shouldShowSignedInState = Boolean(sessionUser && (isSiteAuthenticated || hasWorkspaceSession))

  if (!shouldShowSignedInState) {
    return (
      <>
        <Link href="/login?next=%2Fworkspace" className="rounded-full px-3 py-2 text-[13px] transition hover:bg-quantum-white/8 hover:text-quantum-white sm:text-sm">
          Sign in
        </Link>
        <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-3 py-2 text-[13px] text-quantum-white transition hover:bg-quantum-white/8 sm:text-sm">
          Workspace
        </Link>
      </>
    )
  }

  return (
    <>
      <span className="rounded-full border border-spectral-cyan-400/18 bg-spectral-cyan-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-spectral-cyan-100">
        Signed in
      </span>
      <Link href="/workspace" className="rounded-full border border-quantum-white/12 px-3 py-2 text-[13px] text-quantum-white transition hover:bg-quantum-white/8 sm:text-sm">
        Workspace
      </Link>
      <button
        type="button"
        onClick={() => {
          void signOut()
        }}
        className="rounded-full px-3 py-2 text-[13px] transition hover:bg-quantum-white/8 hover:text-quantum-white sm:text-sm"
      >
        Sign out
      </button>
      {sessionUser?.displayName ? (
        <span className="hidden rounded-full border border-quantum-white/10 px-3 py-2 text-[13px] text-quantum-white/58 lg:inline-flex">
          {sessionUser.displayName}
        </span>
      ) : null}
    </>
  )
}
