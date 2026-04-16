'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/DashboardShell'
import { GlassCard } from '@/components/GlassCard'
import { StatCard } from '@/components/StatCard'
import { Table } from '@/components/Table'
import { DashboardSystemEvent, fetchSystemEvents, LIVE_REFRESH_INTERVAL_MS, summarizeEventPayload } from '@/lib/dashboard'

export default function EventsPage() {
  const [events, setEvents] = useState<DashboardSystemEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        const rows = await fetchSystemEvents(40)
        if (!cancelled) {
          setEvents(rows)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load events')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  const eventTypes = useMemo(() => new Set(events.map((event) => event.type)).size, [events])
  const activeSources = useMemo(() => new Set(events.map((event) => event.source)).size, [events])

  const columns = [
    { key: 'type', header: 'Type', sortable: true },
    { key: 'source', header: 'Source', sortable: true },
    { key: 'summary', header: 'Summary', render: (_value: string, row: DashboardSystemEvent) => summarizeEventPayload(row.data) },
    { key: 'createdAt', header: 'Recorded', sortable: true, render: (value: string) => new Date(value).toLocaleString() },
  ]

  return (
    <DashboardShell
      title="Events"
      subtitle="Detailed event-stream history for the current authenticated session, with a wider operational window than the overview page."
    >
      {error && <GlassCard tier={2} glow="amber" className="p-4 text-sm text-amber-signal-500">{error}</GlassCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Events Loaded" value={loading ? '...' : events.length} trend={{ direction: 'up', value: 'Expanded window' }} />
        <StatCard title="Event Types" value={loading ? '...' : eventTypes} trend={{ direction: 'neutral', value: 'Unique categories' }} />
        <StatCard title="Sources" value={loading ? '...' : activeSources} trend={{ direction: 'neutral', value: 'Contributing subsystems' }} />
        <StatCard title="Latest Event" value={events[0]?.type || 'None'} trend={{ direction: 'up', value: events[0]?.source || 'Awaiting data' }} />
      </section>

      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-quantum-white">Event archive</h2>
        <div className="mt-6">
          <Table data={events} columns={columns} loading={loading} emptyMessage="No events were returned for this session" />
        </div>
      </GlassCard>
    </DashboardShell>
  )
}