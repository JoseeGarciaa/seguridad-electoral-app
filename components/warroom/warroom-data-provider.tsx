"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type WarRoomCandidate = {
  id: string
  name: string
  party: string | null
  votes: number
  percentage: number
  color: string | null
}

export type WarRoomFeedItem = {
  id: string
  user: string
  action: string
  location: string
  reportedAt: string
  type: "evidence" | "verification" | "alert" | "checkin" | "assignment"
}

export type WarRoomAlert = {
  id: string
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  time: string
  status?: "abierta" | "atendida" | "resuelta"
  category?: string
}

export type WarRoomMunicipality = {
  name: string
  coverage: number
  reported: number
  total: number
  status: "green" | "yellow" | "red"
}

export type WarRoomEvidence = {
  id: string
  puesto: string
  mesa: string
  user: string
  time: string
  status: "verified" | "pending" | "issue"
  photoUrl: string | null
}

export type WarRoomStats = {
  reports: number
  activeDelegates: number
  coverage: number
  reportedLocations: number
  totalLocations: number
  lastUpdated: string
}

export type WarRoomPayload = {
  stats: WarRoomStats
  candidates: WarRoomCandidate[]
  feed: WarRoomFeedItem[]
  alerts: WarRoomAlert[]
  municipalities: WarRoomMunicipality[]
  evidences: WarRoomEvidence[]
}

const WarRoomContext = createContext<{
  data: WarRoomPayload | null
  loading: boolean
  error: string | null
}>({ data: null, loading: true, error: null })

async function fetchWarRoom(): Promise<WarRoomPayload> {
  const res = await fetch("/api/warroom", { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`WarRoom API error ${res.status}`)
  }
  return res.json()
}

export function WarRoomDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WarRoomPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let inFlight = false
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const refresh = async () => {
      if (!mounted || inFlight) return
      inFlight = true
      try {
        const payload = await fetchWarRoom()
        if (!mounted) return
        setData(payload)
        setLoading(false)
        setError(null)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message ?? "Error cargando datos")
        setLoading(false)
      } finally {
        inFlight = false
      }
    }

    const startStream = () => {
      if (!mounted || typeof window === "undefined" || !("EventSource" in window)) return
      source = new EventSource("/api/warroom/stream")
      source.addEventListener("update", () => {
        refresh()
      })
      source.addEventListener("ready", () => {
        refresh()
      })
      source.onerror = () => {
        source?.close()
        source = null
        if (!mounted) return
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(startStream, 5_000)
      }
    }

    refresh()
    startStream()

    const interval = setInterval(() => {
      refresh()
    }, 30_000)

    return () => {
      mounted = false
      clearInterval(interval)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (source) source.close()
    }
  }, [])

  const value = useMemo(() => ({ data, loading, error }), [data, loading, error])

  return <WarRoomContext.Provider value={value}>{children}</WarRoomContext.Provider>
}

export function useWarRoomData() {
  return useContext(WarRoomContext)
}
