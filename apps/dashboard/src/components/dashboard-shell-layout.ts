import { clsx } from 'clsx'
import type { DashboardOnboardingWorkspace } from '@/lib/dashboard'
import type { LayoutMode, SidebarPosition, WorkspaceFormation } from '@/onboarding'

export const DASHBOARD_SHELL_SETTINGS_UPDATED_EVENT = 'ion-dashboard-shell-settings-updated'
export const WORKSPACE_FORMATION_STORAGE_PREFIX = 'ionirix:onboarding:formation:'

export interface DashboardShellArrangement {
  layoutMode: LayoutMode
  sidebarPosition: SidebarPosition
}

export interface DashboardShellLayoutClasses {
  navHidden: boolean
  navSide: 'left' | 'right'
  shellRowClassName: string
  frameClassName: string
  introClassName: string
  introCopyClassName: string
}

const DEFAULT_ARRANGEMENT: DashboardShellArrangement = {
  layoutMode: 'grid',
  sidebarPosition: 'left',
}

const layoutValues = new Set<LayoutMode>(['grid', 'stack', 'focus'])
const sidebarValues = new Set<SidebarPosition>(['left', 'right', 'hidden'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function pickEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback
}

export function resolveDashboardShellArrangement(
  workspace: DashboardOnboardingWorkspace | null,
  localFormation: WorkspaceFormation | null,
): DashboardShellArrangement {
  const shell = asRecord(workspace?.shell)
  const preferences = asRecord(workspace?.context?.preferences)

  return {
    layoutMode: pickEnum(preferences.layoutMode ?? shell.layoutMode ?? localFormation?.shell.layoutMode, layoutValues, DEFAULT_ARRANGEMENT.layoutMode),
    sidebarPosition: pickEnum(preferences.sidebarPosition ?? shell.sidebarPosition ?? localFormation?.shell.sidebarPosition, sidebarValues, DEFAULT_ARRANGEMENT.sidebarPosition),
  }
}

export function buildDashboardShellLayoutClasses(arrangement: DashboardShellArrangement): DashboardShellLayoutClasses {
  const navHidden = arrangement.sidebarPosition === 'hidden'
  const navSide = arrangement.sidebarPosition === 'right' ? 'right' : 'left'
  const stacked = arrangement.layoutMode === 'stack'
  const focused = arrangement.layoutMode === 'focus'

  return {
    navHidden,
    navSide,
    shellRowClassName: clsx('relative z-10 flex min-h-screen w-full', navSide === 'right' && !navHidden && 'md:flex-row-reverse'),
    frameClassName: clsx(
      'workspace-shell-frame site-content-frame mx-auto flex w-full min-w-0 flex-col',
      focused ? 'max-w-[72rem] gap-4 sm:gap-5' : stacked ? 'max-w-[84rem] gap-5 sm:gap-6' : 'gap-5 sm:gap-6',
    ),
    introClassName: clsx('workspace-page-intro', focused && 'xl:max-w-[60rem]'),
    introCopyClassName: clsx('workspace-page-intro-copy min-w-0', focused ? 'max-w-[52rem]' : stacked ? 'max-w-[60rem]' : 'max-w-[72rem]'),
  }
}

export function dispatchDashboardShellSettingsUpdated(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(DASHBOARD_SHELL_SETTINGS_UPDATED_EVENT))
}