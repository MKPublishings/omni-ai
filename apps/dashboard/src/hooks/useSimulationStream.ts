'use client'

import { useEffect, useState } from 'react'
import {
  DashboardSimulationRecord,
  DashboardSimulationSnapshotMeta,
  DashboardSimulationState,
  DashboardSimulationStreamMessage,
  fetchSimulationState,
  getSimulationStreamUrl,
} from '@/lib/dashboard'

type ConnectionState = 'idle' | 'loading' | 'connected' | 'polling' | 'error'

type UseSimulationStreamResult = {
  simulation: DashboardSimulationRecord | null
  state: DashboardSimulationState | null
  snapshot: DashboardSimulationSnapshotMeta | null
  connectionState: ConnectionState
  loading: boolean
  error: string
  lastMessageAt: string | null
}

const TERMINAL_STATUSES = new Set(['completed', 'terminated', 'error'])
const POLL_FALLBACK_INTERVAL_MS = 5000

export function useSimulationStream(simulationId: string | null): UseSimulationStreamResult {
  const [simulation, setSimulation] = useState<DashboardSimulationRecord | null>(null)
  const [state, setState] = useState<DashboardSimulationState | null>(null)
  const [snapshot, setSnapshot] = useState<DashboardSimulationSnapshotMeta | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null)

  useEffect(() => {
    if (!simulationId) {
      setSimulation(null)
      setState(null)
      setSnapshot(null)
      setConnectionState('idle')
      setLoading(false)
      setError('')
      setLastMessageAt(null)
      return
    }

    let active = true
    let socket: WebSocket | null = null
    let pollingHandle: number | null = null
    let terminalStatus = false

    const applyState = (payload: {
      simulation?: DashboardSimulationRecord | null
      state?: DashboardSimulationState | null
      snapshot?: DashboardSimulationSnapshotMeta | null
      timestamp?: string | null
    }) => {
      if (!active) {
        return
      }

      if (payload.simulation) {
        setSimulation(payload.simulation)
        terminalStatus = TERMINAL_STATUSES.has(String(payload.simulation.status || '').toLowerCase())
      }
      if (payload.state !== undefined) {
        setState(payload.state || null)
      }
      if (payload.snapshot !== undefined) {
        setSnapshot(payload.snapshot || null)
      }
      if (payload.timestamp) {
        setLastMessageAt(payload.timestamp)
      }
    }

    const stopPolling = () => {
      if (pollingHandle) {
        window.clearInterval(pollingHandle)
        pollingHandle = null
      }
    }

    const loadSnapshot = async (markLoaded = false) => {
      try {
        const payload = await fetchSimulationState(simulationId)
        applyState({
          simulation: payload.simulation,
          state: payload.state,
          snapshot: payload.latestSnapshot,
          timestamp: payload.state?.timestamp || payload.latestSnapshot?.createdAt || new Date().toISOString(),
        })
        setError('')
      } catch (err) {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Unable to load simulation state')
        setConnectionState('error')
      } finally {
        if (active && markLoaded) {
          setLoading(false)
        }
      }
    }

    const startPolling = () => {
      stopPolling()
      if (!active || terminalStatus) {
        setConnectionState(terminalStatus ? 'idle' : 'polling')
        return
      }

      setConnectionState('polling')
      void loadSnapshot()
      pollingHandle = window.setInterval(() => {
        void loadSnapshot()
      }, POLL_FALLBACK_INTERVAL_MS)
    }

    setLoading(true)
    setError('')
    setConnectionState('loading')
    void loadSnapshot(true)

    const streamUrl = getSimulationStreamUrl(simulationId)
    if (!streamUrl) {
      startPolling()
      return () => {
        active = false
        stopPolling()
      }
    }

    try {
      socket = new WebSocket(streamUrl)
      socket.onopen = () => {
        if (!active) {
          return
        }
        setConnectionState('connected')
        setError('')
      }

      socket.onmessage = (event) => {
        if (!active) {
          return
        }

        try {
          const payload = JSON.parse(String(event.data || '{}')) as DashboardSimulationStreamMessage

          if (payload.type === 'error') {
            setError(payload.error || 'Simulation stream error')
            setConnectionState('error')
            return
          }

          if (payload.type === 'connection') {
            setConnectionState('connected')
            if (payload.timestamp) {
              setLastMessageAt(payload.timestamp)
            }
            return
          }

          applyState({
            simulation: payload.simulation || null,
            state: payload.state || null,
            snapshot: payload.snapshot || null,
            timestamp: payload.timestamp || payload.state?.timestamp || new Date().toISOString(),
          })

          if (payload.simulation && TERMINAL_STATUSES.has(String(payload.simulation.status || '').toLowerCase())) {
            terminalStatus = true
            setConnectionState('idle')
            stopPolling()
            socket?.close()
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid simulation stream payload')
          setConnectionState('error')
        }
      }

      socket.onerror = () => {
        if (!active) {
          return
        }
        setError('Live simulation stream unavailable, falling back to snapshot polling')
      }

      socket.onclose = () => {
        if (!active) {
          return
        }
        if (terminalStatus) {
          setConnectionState('idle')
          stopPolling()
          return
        }
        startPolling()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open simulation stream')
      startPolling()
    }

    return () => {
      active = false
      stopPolling()
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [simulationId])

  return {
    simulation,
    state,
    snapshot,
    connectionState,
    loading,
    error,
    lastMessageAt,
  }
}