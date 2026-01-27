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
    fetchWarRoom()
      .then((payload) => {
        if (!mounted) return
        setData(payload)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message)
        setLoading(false)
      })
    const interval = setInterval(() => {
      fetchWarRoom()
        .then((payload) => mounted && setData(payload))
        .catch((err) => mounted && setError(err.message))
    }, 30_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const value = useMemo(() => ({ data, loading, error }), [data, loading, error])

  return <WarRoomContext.Provider value={value}>{children}</WarRoomContext.Provider>
}

export function useWarRoomData() {
  return useContext(WarRoomContext)
}
