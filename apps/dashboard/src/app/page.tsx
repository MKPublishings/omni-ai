'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authorizedFetch, clearAuthSession, getApiUrl, getStoredToken } from '@/lib/auth'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { NavigationRail, NavItem } from '@/components/NavigationRail'
import { CommandBar } from '@/components/CommandBar'
import { StatCard } from '@/components/StatCard'
import { DataPanel } from '@/components/DataPanel'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { AmbientBackground } from '@/components/AmbientBackground'
import { Table } from '@/components/Table'
import { StatCardSkeleton, TableSkeleton, ConversationSkeleton } from '@/components/Skeleton'

type ZoneFocus = 'sanctuary' | 'performance' | 'transition' | null

type DashboardStatus = {
  version: string
  status: string
  uptime: number
  timestamp: string
  counts: {
    authUsers: number
    sessions: number
    toolExecutions: number
    simulationRuns: number
  }
  environment: {
    region: string
    platform: string
  }
}

type ActivityRow = {
  id: string
  type: string
  source: string
  summary: string
  createdAt: string
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 'just started'
  }

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }

  return `${Math.max(1, Math.floor(totalSeconds))}s`
}

function summarizeEventPayload(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Event recorded'
  }

  const payload = data as Record<string, unknown>
  const summaryFields = ['message', 'summary', 'status', 'detail', 'mode', 'taskType']

  for (const field of summaryFields) {
    const value = payload[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return Object.entries(payload)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ') || 'Event recorded'
}

export default function Home() {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [zoneFocus, setZoneFocus] = useState<ZoneFocus>(null)
  const [aiMessages, setAiMessages] = useState<Array<{
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
  }>>([
    {
      id: '1',
      type: 'ai' as const,
      content: 'Hello! I\'m ION AI, your cognitive operating system. How can I help you today?',
      timestamp: new Date(Date.now() - 300000)
    }
  ])
  const [isThinking, setIsThinking] = useState(false)
  const [panelSplit, setPanelSplit] = useState(65) // Percentage for left panel width
  const [isDragging, setIsDragging] = useState(false)
  const [systemStatus, setSystemStatus] = useState<DashboardStatus | null>(null)
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingActivity, setIsLoadingActivity] = useState(true)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken()

      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await authorizedFetch(getApiUrl('/api/auth/me'))

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setIsAuthenticated(true)
        } else {
          clearAuthSession()
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        clearAuthSession()
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  // Logout handler
  const handleLogout = async () => {
    try {
      await authorizedFetch(getApiUrl('/api/auth/logout'), { method: 'POST' })
    } catch (error) {
      console.error('Logout failed:', error)
    }

    clearAuthSession()
    setUser(null)
    setIsAuthenticated(false)
    router.push('/login')
  }

  // Panel drag handlers
  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const newSplit = ((e.clientX - rect.left) / rect.width) * 100
    setPanelSplit(Math.max(40, Math.min(80, newSplit))) // Constrain between 40% and 80%
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const fetchDashboardData = async () => {
      setIsLoadingStats(true)
      setIsLoadingActivity(true)
      setStatusError('')

      try {
        const [statusResponse, eventsResponse] = await Promise.all([
          authorizedFetch(getApiUrl('/api/system/status')),
          authorizedFetch(getApiUrl('/api/system/events?limit=8')),
        ])

        if (!statusResponse.ok) {
          throw new Error('Failed to load system status')
        }

        const statusPayload = await statusResponse.json()
        setSystemStatus(statusPayload)

        if (eventsResponse.ok) {
          const eventsPayload = await eventsResponse.json()
          const rows = Array.isArray(eventsPayload.events)
            ? eventsPayload.events.map((event: any) => ({
                id: String(event.id),
                type: String(event.type || 'event'),
                source: String(event.source || 'system'),
                summary: summarizeEventPayload(event.data),
                createdAt: String(event.createdAt || ''),
              }))
            : []
          setActivityRows(rows)
        } else {
          setActivityRows([])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setSystemStatus(null)
        setActivityRows([])
        setStatusError(error instanceof Error ? error.message : 'Unable to load dashboard data')
      } finally {
        setIsLoadingStats(false)
        setIsLoadingActivity(false)
      }
    }

    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Zone focus handlers
  const handleZoneFocus = (zone: ZoneFocus) => {
    setZoneFocus(zone)
  }

  const handleZoneBlur = () => {
    setZoneFocus(null)
  }

  // Auto-clear zone focus after 3 seconds of inactivity
  useEffect(() => {
    if (zoneFocus) {
      const timer = setTimeout(() => {
        setZoneFocus(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [zoneFocus])

  const handleSendMessage = async (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date()
    }

    setAiMessages(prev => [...prev, userMessage])
    setIsThinking(true)
    setIsLoadingConversation(true)

    try {
      const token = getStoredToken()

      // Call real ION AI API
      const response = await fetch(getApiUrl('/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: 'reasoning.speak',
          mode: 'analysis',
          input: {
            query: message,
            context: 'ION AI Dashboard interaction'
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`ION AI API error: ${response.status}`)
      }

      const data = await response.json()

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: data.response || 'I have processed your request through my cognitive systems.',
        timestamp: new Date()
      }

      setAiMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error calling ION AI:', error)
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: 'I apologize, but I encountered an error connecting to the ION AI system. Please try again.',
        timestamp: new Date()
      }
      setAiMessages(prev => [...prev, errorResponse])
    } finally {
      setIsThinking(false)
      setIsLoadingConversation(false)
    }
  }

  const tableColumns = [
    { key: 'type', header: 'Event Type', sortable: true },
    { key: 'source', header: 'Source', sortable: true },
    { key: 'summary', header: 'Summary' },
    {
      key: 'createdAt',
      header: 'Recorded',
      render: (value: string) => new Date(value).toLocaleString(),
      sortable: true,
    },
  ]

  return (
    <div className="h-screen flex bg-pine-black-900 relative overflow-hidden">
      {/* Ambient Background Animations */}
      <AmbientBackground />

      {/* Light leak effects between zones */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Sanctuary to Performance light leak */}
        <div className={`absolute left-16 top-0 bottom-0 w-px bg-gradient-to-r from-spectral-cyan-500/20 to-transparent transition-opacity duration-1000 ${
          zoneFocus === 'sanctuary' ? 'opacity-60' : 'opacity-20'
        }`} />
        {/* Performance to Transition light leak */}
        <div className={`absolute top-16 left-16 right-0 h-px bg-gradient-to-b from-spectral-cyan-500/20 to-transparent transition-opacity duration-1000 ${
          zoneFocus === 'performance' ? 'opacity-60' : 'opacity-20'
        }`} />
      </div>

      {/* Sanctuary Zone - NavigationRail */}
      <div
        className={`transition-all duration-500 ${
          zoneFocus === 'sanctuary' ? 'shadow-2xl shadow-spectral-cyan-500/30' : ''
        }`}
        onMouseEnter={() => handleZoneFocus('sanctuary')}
        onMouseLeave={handleZoneBlur}
      >
        <NavigationRail collapsed={navCollapsed}>
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" /></svg>}
            label="Dashboard"
            active
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l.707.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
            label="AI Assistant"
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            label="Analytics"
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" /></svg>}
            label="Settings"
          />
        </NavigationRail>
      </div>

      {/* Performance Zone - Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-500 ${
          zoneFocus === 'performance' ? 'shadow-2xl shadow-spectral-cyan-500/30' : ''
        }`}
        onMouseEnter={() => handleZoneFocus('performance')}
        onMouseLeave={handleZoneBlur}
      >
        {/* Transition Zone - CommandBar */}
        <div
          className={`transition-all duration-500 ${
            zoneFocus === 'transition' ? 'shadow-2xl shadow-spectral-cyan-500/30' : ''
          }`}
          onMouseEnter={() => handleZoneFocus('transition')}
          onMouseLeave={handleZoneBlur}
        >
          <CommandBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            breadcrumbs={['Dashboard', 'Overview']}
          />
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-quantum-white">ION Dashboard</h1>
                <p className="text-quantum-white/64 mt-1">
                  {user ? `Welcome back, ${user.displayName}. Here's your live system overview.` : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {user && (
                  <div className="flex items-center space-x-3 text-quantum-white/64 text-sm">
                    <span>{user.email}</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                )}
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            </div>

            {statusError && (
              <GlassCard tier={2} className="p-4 border border-amber-signal-500/30">
                <p className="text-sm text-amber-signal-500">{statusError}</p>
              </GlassCard>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoadingStats ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    title="Registered Users"
                    value={systemStatus?.counts.authUsers?.toLocaleString() || '0'}
                    trend={{ direction: 'neutral', value: 'D1 live' }}
                    sparkline
                  />
                  <StatCard
                    title="Tool Executions"
                    value={systemStatus?.counts.toolExecutions?.toLocaleString() || '0'}
                    trend={{ direction: 'neutral', value: 'Observed' }}
                  />
                  <StatCard
                    title="Simulation Runs"
                    value={systemStatus?.counts.simulationRuns?.toLocaleString() || '0'}
                    trend={{ direction: 'neutral', value: `Uptime ${formatDuration(systemStatus?.uptime || 0)}` }}
                    sparkline
                  />
                </>
              )}
            </div>

            {/* Main Content Grid with Drag-Resize */}
            <div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Data Panel - Resizable */}
              <div
                className="lg:col-span-2 transition-all duration-200"
                style={{ width: `${panelSplit}%` }}
              >
                <DataPanel
                  title="Recent Activity"
                  subtitle="Live events recorded in the Worker backend"
                  action={
                    <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                      Reload
                    </Button>
                  }
                >
                  <Table
                    data={activityRows}
                    columns={tableColumns}
                    loading={isLoadingActivity}
                    emptyMessage="No live activity yet"
                  />
                </DataPanel>
              </div>

              {/* Drag Handle */}
              <div
                className="hidden lg:flex items-center justify-center cursor-col-resize group"
                onMouseDown={handleMouseDown}
              >
                <div className="w-1 h-16 bg-quantum-white/20 group-hover:bg-spectral-cyan-500/60 transition-colors duration-200 rounded-full" />
              </div>

              {/* AI Conversation Panel - Resizable */}
              <div
                className="transition-all duration-200"
                style={{ width: `${100 - panelSplit}%` }}
              >
                <AIConversationPanel
                  messages={aiMessages}
                  onSendMessage={handleSendMessage}
                  isThinking={isThinking}
                  isLoading={isLoadingConversation}
                />
              </div>
            </div>

            {/* Live Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard tier={1} className="p-6">
                <h3 className="text-xl font-semibold text-quantum-white mb-4">Access Profile</h3>
                <div className="space-y-3 text-sm text-quantum-white/72">
                  <div className="flex items-center justify-between">
                    <span>Username</span>
                    <span className="text-quantum-white">{user?.username || 'Unavailable'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    <span className="text-quantum-white">{user?.role || 'Unavailable'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    <span className="text-quantum-white">{user?.email || 'Unavailable'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Verification</span>
                    <span className="text-quantum-white">{user?.emailVerified ? 'Verified' : 'Pending'}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard tier={2} className="p-6">
                <h3 className="text-xl font-semibold text-quantum-white mb-4">Platform State</h3>
                <div className="space-y-3 text-sm text-quantum-white/72">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className="text-quantum-white">{systemStatus?.status || 'Unavailable'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Version</span>
                    <span className="text-quantum-white">{systemStatus?.version || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Platform</span>
                    <span className="text-quantum-white">{systemStatus?.environment.platform || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Region</span>
                    <span className="text-quantum-white">{systemStatus?.environment.region || 'unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Updated</span>
                    <span className="text-quantum-white">{systemStatus ? new Date(systemStatus.timestamp).toLocaleString() : 'Unavailable'}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}