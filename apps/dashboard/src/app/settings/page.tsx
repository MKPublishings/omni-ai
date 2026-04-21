'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { clearCachedAssistantMessages, getCachedAssistantMessageCount } from '@/lib/assistant-chat'
import {
  clearChatHistory,
  DashboardChatHistoryTurn,
  DashboardChatPreferences,
  DashboardOnboardingWorkspace,
  DashboardSystemStatus,
  fetchChatHistory,
  fetchChatSettings,
  fetchDashboardUser,
  fetchOnboardingWorkspace,
  fetchSystemStatus,
  LIVE_REFRESH_INTERVAL_MS,
  provisionOnboardingWorkspace,
  updateChatSettings,
} from '@/lib/dashboard'
import { AuthUser } from '@/lib/auth'
import {
  buildWorkspaceFormation,
  CAPABILITY_CATALOG,
  createInitialOnboardingState,
  loadPersistedOnboardingState,
  loadWorkspaceFormation,
  saveWorkspaceFormation,
  validateStep,
  type DashboardThemePreference,
  type DensityPreference,
  type ExperienceLevel,
  type LayoutMode,
  type MotionPreference,
  type OnboardingState,
  type PreferencesDraft,
  type SidebarPosition,
  type WorkspaceCapabilityId,
  type WorkspaceDraft,
} from '@/onboarding'
import { InterfacePreferencesSection } from '@/onboarding/components/InterfacePreferencesSection'
import { WorkspaceConfigurationSection } from '@/onboarding/components/WorkspaceConfigurationSection'

const onboardingDefaults = createInitialOnboardingState()
const capabilityIds = new Set<WorkspaceCapabilityId>(CAPABILITY_CATALOG.map((capability) => capability.id))
const roleValues = new Set<ExperienceLevel>(['founder', 'operator', 'builder', 'analyst'])
const themeValues = new Set<DashboardThemePreference>(['dark', 'light', 'system'])
const densityValues = new Set<DensityPreference>(['compact', 'comfortable', 'spacious'])
const motionValues = new Set<MotionPreference>(['full', 'reduced', 'none'])
const layoutValues = new Set<LayoutMode>(['grid', 'stack', 'focus'])
const sidebarValues = new Set<SidebarPosition>(['left', 'right', 'hidden'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback
}

function pickCapabilities(value: unknown, fallback: WorkspaceCapabilityId[]): WorkspaceCapabilityId[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const capabilities = value.filter((entry): entry is WorkspaceCapabilityId => typeof entry === 'string' && capabilityIds.has(entry as WorkspaceCapabilityId))
  return capabilities.length > 0 ? capabilities : fallback
}

function buildWorkspaceDraftFromSources(workspace: DashboardOnboardingWorkspace | null): WorkspaceDraft {
  const persistedDraft = loadPersistedOnboardingState()
  const localFormation = loadWorkspaceFormation()
  const workspaceContext = asRecord(workspace?.context?.workspace)
  const enabledModules = workspace?.modules.filter((module) => module.enabled).map((module) => module.id as WorkspaceCapabilityId) ?? []

  return {
    ...onboardingDefaults.workspace,
    ...(persistedDraft?.workspace ?? {}),
    name:
      typeof workspaceContext.name === 'string'
        ? workspaceContext.name
        : workspace?.workspaceName || localFormation?.workspaceName || persistedDraft?.workspace.name || onboardingDefaults.workspace.name,
    slug:
      typeof workspaceContext.slug === 'string'
        ? workspaceContext.slug
        : workspace?.workspaceSlug || localFormation?.workspaceSlug || persistedDraft?.workspace.slug || onboardingDefaults.workspace.slug,
    role: pickEnum(workspaceContext.role, roleValues, persistedDraft?.workspace.role ?? onboardingDefaults.workspace.role),
    intent:
      typeof workspaceContext.intent === 'string'
        ? workspaceContext.intent
        : persistedDraft?.workspace.intent || onboardingDefaults.workspace.intent,
    teamMode:
      typeof workspaceContext.teamMode === 'boolean'
        ? workspaceContext.teamMode
        : (workspace?.orchestration.collaboration === 'team') || persistedDraft?.workspace.teamMode || false,
    capabilities: pickCapabilities(
      workspaceContext.capabilities,
      pickCapabilities(enabledModules, persistedDraft?.workspace.capabilities ?? onboardingDefaults.workspace.capabilities)
    ),
  }
}

function buildPreferencesDraftFromSources(workspace: DashboardOnboardingWorkspace | null): PreferencesDraft {
  const persistedDraft = loadPersistedOnboardingState()
  const localFormation = loadWorkspaceFormation()
  const preferencesContext = asRecord(workspace?.context?.preferences)
  const shell = asRecord(workspace?.shell)
  const orchestration = asRecord(workspace?.orchestration)
  const fallback = persistedDraft?.preferences ?? onboardingDefaults.preferences

  return {
    ...onboardingDefaults.preferences,
    ...fallback,
    theme: pickEnum(preferencesContext.theme ?? shell.theme ?? localFormation?.shell.theme, themeValues, fallback.theme),
    density: pickEnum(preferencesContext.density ?? shell.density ?? localFormation?.shell.density, densityValues, fallback.density),
    motion: pickEnum(preferencesContext.motion ?? shell.motion ?? localFormation?.shell.motion, motionValues, fallback.motion),
    layoutMode: pickEnum(preferencesContext.layoutMode ?? shell.layoutMode ?? localFormation?.shell.layoutMode, layoutValues, fallback.layoutMode),
    sidebarPosition: pickEnum(preferencesContext.sidebarPosition ?? shell.sidebarPosition ?? localFormation?.shell.sidebarPosition, sidebarValues, fallback.sidebarPosition),
    telemetryOptIn:
      typeof preferencesContext.telemetryOptIn === 'boolean'
        ? preferencesContext.telemetryOptIn
        : (orchestration.telemetry === 'full') || fallback.telemetryOptIn,
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<DashboardSystemStatus | null>(null)
  const [chatPreferences, setChatPreferences] = useState<DashboardChatPreferences | null>(null)
  const [onboardingWorkspace, setOnboardingWorkspace] = useState<DashboardOnboardingWorkspace | null>(null)
  const [chatTurns, setChatTurns] = useState<DashboardChatHistoryTurn[]>([])
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(onboardingDefaults.workspace)
  const [preferencesDraft, setPreferencesDraft] = useState<PreferencesDraft>(onboardingDefaults.preferences)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [workspaceActionMessage, setWorkspaceActionMessage] = useState('')
  const [savingKey, setSavingKey] = useState<'persistHistory' | 'contextCarryover' | ''>('')
  const [isClearingHistory, setIsClearingHistory] = useState(false)
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [cachedMessageCount, setCachedMessageCount] = useState(0)
  const [workspaceSettingsDirty, setWorkspaceSettingsDirty] = useState(false)
  const [workspaceDraftInitialized, setWorkspaceDraftInitialized] = useState(false)
  const [workspaceErrors, setWorkspaceErrors] = useState<string[]>([])
  const [preferencesErrors, setPreferencesErrors] = useState<string[]>([])

  const loadSettings = () => {
    setError('')
    setCachedMessageCount(getCachedAssistantMessageCount())
    Promise.all([fetchDashboardUser(), fetchSystemStatus(), fetchChatSettings(), fetchChatHistory(200), fetchOnboardingWorkspace()])
      .then(([userPayload, nextStatus, chatSettingsPayload, chatHistoryPayload, onboardingWorkspacePayload]) => {
        setUser(userPayload.user)
        setStatus(nextStatus)
        setChatPreferences(chatSettingsPayload.preferences)
        setChatTurns(Array.isArray(chatHistoryPayload.turns) ? chatHistoryPayload.turns : [])
        setOnboardingWorkspace(onboardingWorkspacePayload)

        if (!workspaceSettingsDirty || !workspaceDraftInitialized) {
          setWorkspaceDraft(buildWorkspaceDraftFromSources(onboardingWorkspacePayload))
          setPreferencesDraft(buildPreferencesDraftFromSources(onboardingWorkspacePayload))
          setWorkspaceErrors([])
          setPreferencesErrors([])
          setWorkspaceDraftInitialized(true)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load settings'))
  }

  useEffect(() => {
    loadSettings()
    const interval = window.setInterval(loadSettings, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [workspaceDraftInitialized, workspaceSettingsDirty])

  const handleToggle = async (key: 'persistHistory' | 'contextCarryover') => {
    if (!chatPreferences) {
      return
    }

    setSavingKey(key)
    setActionMessage('')

    try {
      const nextValue = !chatPreferences[key]
      const payload = await updateChatSettings({ [key]: nextValue })
      setChatPreferences(payload.preferences)
      setActionMessage(key === 'persistHistory' ? 'Chat history sync updated.' : 'Context carryover updated.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not update chat settings')
    } finally {
      setSavingKey('')
    }
  }

  const handleWorkspaceChange = (payload: Partial<WorkspaceDraft>) => {
    setWorkspaceDraft((current) => ({ ...current, ...payload }))
    setWorkspaceErrors([])
    setWorkspaceActionMessage('')
    setWorkspaceSettingsDirty(true)
  }

  const handleCapabilityToggle = (capability: WorkspaceCapabilityId) => {
    setWorkspaceDraft((current) => {
      const nextCapabilities = current.capabilities.includes(capability)
        ? current.capabilities.filter((entry) => entry !== capability)
        : [...current.capabilities, capability]

      return {
        ...current,
        capabilities: nextCapabilities,
      }
    })
    setWorkspaceErrors([])
    setWorkspaceActionMessage('')
    setWorkspaceSettingsDirty(true)
  }

  const handlePreferencesChange = (payload: Partial<PreferencesDraft>) => {
    setPreferencesDraft((current) => ({ ...current, ...payload }))
    setPreferencesErrors([])
    setWorkspaceActionMessage('')
    setWorkspaceSettingsDirty(true)
  }

  const handleResetWorkspaceSettings = () => {
    setWorkspaceDraft(buildWorkspaceDraftFromSources(onboardingWorkspace))
    setPreferencesDraft(buildPreferencesDraftFromSources(onboardingWorkspace))
    setWorkspaceErrors([])
    setPreferencesErrors([])
    setWorkspaceActionMessage('Workspace settings reverted to the latest saved onboarding configuration.')
    setWorkspaceSettingsDirty(false)
  }

  const handleSaveWorkspaceSettings = async () => {
    const baseState = createInitialOnboardingState()
    const nextState: OnboardingState = {
      ...baseState,
      account: {
        ...baseState.account,
        displayName: user?.displayName || baseState.account.displayName,
        username: user?.username || baseState.account.username,
        email: user?.email || baseState.account.email,
      },
      workspace: workspaceDraft,
      preferences: preferencesDraft,
    }

    const nextWorkspaceErrors = validateStep(nextState, 'workspace').errors
    const nextPreferencesErrors = validateStep(nextState, 'preferences').errors

    setWorkspaceErrors(nextWorkspaceErrors)
    setPreferencesErrors(nextPreferencesErrors)
    setWorkspaceActionMessage('')

    if (nextWorkspaceErrors.length > 0 || nextPreferencesErrors.length > 0) {
      setWorkspaceActionMessage('Resolve the highlighted onboarding settings before saving.')
      return
    }

    setIsSavingWorkspace(true)

    try {
      const formation = buildWorkspaceFormation(nextState)
      saveWorkspaceFormation(formation)

      if (typeof window !== 'undefined') {
        if (preferencesDraft.theme === 'system') {
          window.localStorage.removeItem('ion-dashboard-theme')
        } else {
          window.localStorage.setItem('ion-dashboard-theme', preferencesDraft.theme)
        }
      }

      const payload = await provisionOnboardingWorkspace({
        formation,
        context: {
          workspace: { ...workspaceDraft },
          preferences: { ...preferencesDraft },
        },
      })

      setOnboardingWorkspace(payload.workspace)
      setWorkspaceActionMessage('Workspace shell and onboarding settings saved.')
      setWorkspaceSettingsDirty(false)
      setWorkspaceDraftInitialized(true)
    } catch (err) {
      setWorkspaceActionMessage(err instanceof Error ? err.message : 'Could not save onboarding settings')
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const enabledModules = onboardingWorkspace?.modules.filter((module) => module.enabled).length ?? workspaceDraft.capabilities.length

  const handleClearHistory = async () => {
    setIsClearingHistory(true)
    setActionMessage('')

    try {
      await clearChatHistory()
      clearCachedAssistantMessages()
      setChatTurns([])
      setCachedMessageCount(0)
      setActionMessage('Chat history and local assistant chat cleared.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not clear chat history')
    } finally {
      setIsClearingHistory(false)
    }
  }

  const handleExportHistory = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
          }
        : null,
      preferences: chatPreferences,
      turns: chatTurns,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `ion-ai-chat-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
    setActionMessage('Chat history export started.')
  }

  return (
    <DashboardShell
      title="Settings"
      subtitle="Account controls, workspace shell configuration, onboarding preferences, and cross-session continuity for the current signed-in operator."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <GlassCard className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-spectral-cyan-300">Settings system</p>
              <h2 className="mt-3 text-3xl font-semibold text-quantum-white">Keep onboarding and settings in the same operating model.</h2>
              <p className="mt-4 text-sm leading-7 text-quantum-white/68">
                The workspace shell, launch modules, interface posture, and chat continuity now live side by side here, so any account can reach the same controls after onboarding completes.
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-[15rem] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Primary route</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{onboardingWorkspace?.primaryRoute || '/workspace'}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Enabled modules</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{enabledModules}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Capability score</p>
                <p className="mt-2 text-lg font-semibold text-quantum-white">{onboardingWorkspace?.capabilityScore ?? workspaceDraft.capabilities.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-quantum-white/10 bg-black/10 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-quantum-white/48">Provisioning</p>
                <p className="mt-2 text-lg font-semibold capitalize text-quantum-white">{onboardingWorkspace?.provisioningStatus || 'not saved'}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6 sm:p-7">
          <h2 className="text-xl font-semibold text-quantum-white">Saved workspace summary</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Workspace</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{onboardingWorkspace?.workspaceName || workspaceDraft.name}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Slug</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">/{onboardingWorkspace?.workspaceSlug || workspaceDraft.slug}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Interface shell</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{preferencesDraft.layoutMode} · {preferencesDraft.sidebarPosition} · {preferencesDraft.density}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Telemetry posture</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{preferencesDraft.telemetryOptIn ? 'Full' : 'Essential'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Last saved</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{onboardingWorkspace?.updatedAt ? new Date(onboardingWorkspace.updatedAt).toLocaleString() : 'Not saved yet'}</dd>
            </div>
          </dl>
          {Array.isArray(onboardingWorkspace?.summary) && onboardingWorkspace.summary.length > 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-quantum-white/10 bg-black/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-quantum-white/48">Formation notes</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-quantum-white/68">
                {onboardingWorkspace.summary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </GlassCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Account</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Display name</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.displayName || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Username</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{user?.username || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Email</dt>
              <dd className="break-all font-medium text-quantum-white sm:text-right">{user?.email || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Role</dt>
              <dd className="break-words font-medium uppercase tracking-[0.2em] text-quantum-white sm:text-right">{user?.role || 'Loading'}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Edit profile</Link>
            <Link href="/billing/manage" className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-full border border-quantum-white/12 px-4 py-2 text-sm text-quantum-white transition hover:bg-quantum-white/8 sm:min-h-0 sm:flex-none">Open billing</Link>
            <span className="inline-flex min-h-[2.75rem] items-center rounded-full border border-quantum-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {user?.emailVerified ? 'Email verified' : 'Verification pending'}
            </span>
          </div>
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Deployment context</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Platform</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.platform || 'Cloudflare Workers'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Region</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.environment.region || 'Global edge'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Runtime</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.version || 'Loading'}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Status</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{status?.status || 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-quantum-white">Workspace and onboarding settings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-quantum-white/68">
              These are the same workspace formation and interface controls used during onboarding, now available in settings for any signed-in account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleResetWorkspaceSettings} disabled={isSavingWorkspace || (!workspaceSettingsDirty && workspaceDraftInitialized)}>
              Revert changes
            </Button>
            <Button size="sm" onClick={handleSaveWorkspaceSettings} disabled={isSavingWorkspace}>
              {isSavingWorkspace ? 'Saving workspace...' : 'Save workspace settings'}
            </Button>
          </div>
        </div>

        <GlassCard className="p-6 sm:p-8">
          <WorkspaceConfigurationSection
            value={workspaceDraft}
            errors={workspaceErrors}
            onChange={handleWorkspaceChange}
            onToggleCapability={handleCapabilityToggle}
            eyebrow="Workspace shell"
            title="Organize the launch surface."
            description="Adjust naming, posture, module access, and operating intent without sending users back through the onboarding route."
          />
        </GlassCard>

        <GlassCard className="p-6 sm:p-8">
          <InterfacePreferencesSection
            value={preferencesDraft}
            errors={preferencesErrors}
            onChange={handlePreferencesChange}
            eyebrow="Interface behavior"
            title="Calibrate layout, density, motion, and telemetry."
            description="These saved settings drive the same shell behavior model used during onboarding, so the account keeps one consistent interface posture across devices."
          />
        </GlassCard>

        {workspaceActionMessage ? <GlassCard tier={2} className="p-4 text-sm text-ion-blue-200">{workspaceActionMessage}</GlassCard> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-quantum-white">Chat memory</h2>
              <p className="mt-2 text-sm leading-6 text-quantum-white/72">Assistant conversations now sync to your account, reload after navigation, and follow you across browsers and mobile sessions.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-quantum-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-quantum-white/60">
              {chatTurns.length} saved turns · {cachedMessageCount} cached messages
            </span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-quantum-white/8 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-quantum-white">Save chat history</h3>
                <p className="mt-1 text-sm text-quantum-white/60">Store assistant turns on your account so the conversation reloads when you return.</p>
              </div>
              <Button
                variant={chatPreferences?.persistHistory ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleToggle('persistHistory')}
                disabled={!chatPreferences || savingKey === 'persistHistory'}
              >
                {chatPreferences?.persistHistory ? 'History sync on' : 'History sync off'}
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-quantum-white/8 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-quantum-white">Carry saved context</h3>
                <p className="mt-1 text-sm text-quantum-white/60">Reuse recent saved turns so follow-up prompts on another device still have continuity.</p>
              </div>
              <Button
                variant={chatPreferences?.contextCarryover ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleToggle('contextCarryover')}
                disabled={!chatPreferences || savingKey === 'contextCarryover'}
              >
                {chatPreferences?.contextCarryover ? 'Carryover on' : 'Carryover off'}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={handleExportHistory} disabled={chatTurns.length === 0}>
              Export chat history
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearHistory} disabled={isClearingHistory || (chatTurns.length === 0 && cachedMessageCount === 0)}>
              {isClearingHistory ? 'Clearing chat...' : 'Clear chat and history'}
            </Button>
            <Button variant="ghost" size="sm" onClick={loadSettings}>
              Refresh chat status
            </Button>
          </div>

          {actionMessage && <p className="mt-4 text-sm text-ion-blue-200">{actionMessage}</p>}
        </GlassCard>

        <GlassCard tier={2} className="p-6">
          <h2 className="text-xl font-semibold text-quantum-white">Chat sync status</h2>
          <dl className="mt-4 space-y-4 text-sm text-quantum-white/72">
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>History sync</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.persistHistory ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Context carryover</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.contextCarryover ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Stored turns</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatTurns.length}</dd>
            </div>
            <div className="flex flex-col gap-1 border-b border-quantum-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Cached local messages</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{cachedMessageCount}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt>Last preference update</dt>
              <dd className="break-words font-medium text-quantum-white sm:text-right">{chatPreferences?.updatedAt ? new Date(chatPreferences.updatedAt).toLocaleString() : 'Loading'}</dd>
            </div>
          </dl>
        </GlassCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Profile controls</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">Use the profile page to edit your display name and username, then return here for deployment and verification status.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Verification posture</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">New accounts must complete email verification before login. Existing verified operators can still revise the same onboarding shell controls from settings at any time.</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-quantum-white">Cross-device continuity</h2>
          <p className="mt-3 text-sm leading-6 text-quantum-white/72">When history sync stays enabled and workspace settings are saved, assistant context and shell preferences remain recoverable across desktop, mobile, and any other browser session tied to the same login.</p>
        </GlassCard>
      </section>
    </DashboardShell>
  )
}