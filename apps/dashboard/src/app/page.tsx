'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authorizedFetch, clearAuthSession, getStoredToken } from '@/lib/auth'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { NavigationRail, NavItem } from '@/components/NavigationRail'
import { CommandBar } from '@/components/CommandBar'
import { StatCard } from '@/components/StatCard'
import { DataPanel } from '@/components/DataPanel'
import { AIConversationPanel } from '@/components/AIConversationPanel'
import { Modal } from '@/components/Modal'
import { Toast } from '@/components/Toast'
import { AmbientBackground } from '@/components/AmbientBackground'
import { Table } from '@/components/Table'
import { StatCardSkeleton, TableSkeleton, ConversationSkeleton } from '@/components/Skeleton'

type ZoneFocus = 'sanctuary' | 'performance' | 'transition' | null

export default function Home() {
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(false)
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
  const [stats, setStats] = useState({
    activeUsers: 12847,
    systemLoad: 68,
    aiQueries: 3429
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
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
        const response = await authorizedFetch('/api/auth/me')

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
      await authorizedFetch('/api/auth/logout', { method: 'POST' })
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

  // Real-time stats updates
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const newStats = await response.json()
          setStats(newStats)
          setIsLoadingStats(false)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setIsLoadingStats(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Update every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    return () => clearInterval(interval)
  }, [])

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
      const response = await fetch(process.env.NEXT_PUBLIC_ION_API_URL || 'https://ion-ai.ion-ai.workers.dev/', {
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

  const sampleTableData = [
    { id: 1, name: 'Project Alpha', status: 'Active', progress: 85, team: 'Engineering' },
    { id: 2, name: 'Project Beta', status: 'Planning', progress: 20, team: 'Design' },
    { id: 3, name: 'Project Gamma', status: 'Complete', progress: 100, team: 'Marketing' },
  ]

  const tableColumns = [
    { key: 'name', header: 'Project Name', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    {
      key: 'progress',
      header: 'Progress',
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 h-2 bg-quantum-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-spectral-cyan-500 transition-all duration-300"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-xs text-quantum-white/64">{value}%</span>
        </div>
      )
    },
    { key: 'team', header: 'Team', sortable: true },
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
                  {user ? `Welcome back, ${user.name}. Here's your system overview.` : 'Loading...'}
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
                <Button onClick={() => setShowModal(true)}>Open Modal</Button>
                <Button variant="secondary" onClick={() => setShowToast(true)}>Show Toast</Button>
              </div>
            </div>

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
                    title="Active Users"
                    value={stats.activeUsers.toLocaleString()}
                    trend={{ direction: 'up', value: '+12.5%' }}
                    sparkline
                  />
                  <StatCard
                    title="System Load"
                    value={`${stats.systemLoad}%`}
                    trend={{ direction: stats.systemLoad > 80 ? 'down' : 'neutral', value: '+2.1%' }}
                  />
                  <StatCard
                    title="AI Queries"
                    value={stats.aiQueries.toLocaleString()}
                    trend={{ direction: 'up', value: '+8.3%' }}
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
                  subtitle="System events and user interactions"
                  action={
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Export
                    </Button>
                  }
                >
                  <Table
                    data={sampleTableData}
                    columns={tableColumns}
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

            {/* Component Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard tier={1} className="p-6">
                <h3 className="text-xl font-semibold text-quantum-white mb-4">Button Variants</h3>
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div className="flex space-x-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                  <Button glow>Primary with Glow</Button>
                </div>
              </GlassCard>

              <GlassCard tier={2} className="p-6">
                <h3 className="text-xl font-semibold text-quantum-white mb-4">Form Elements</h3>
                <div className="space-y-4">
                  <Input placeholder="Enter your name..." />
                  <Input placeholder="Email address" type="email" />
                  <Input placeholder="Error state" error />
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ION Glass UI System"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-quantum-white/80">
            This is the Ionirix Glass UI System demonstration. The modal showcases the Sovereign Glass material
            with proper backdrop blur and layering.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowModal(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            type="success"
            title="Success!"
            message="Glass UI components are working perfectly."
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}