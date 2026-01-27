"use client"

import { motion } from "framer-motion"
import { Radio, Clock, Users, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useWarRoomData } from "./warroom-data-provider"

export function WarRoomHeader() {
  // Defer real time render to client to prevent SSR/client hydration mismatches.
  const [time, setTime] = useState<Date | null>(null)
  const { data, loading } = useWarRoomData()

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    { label: "Reportes Hoy", value: data?.stats.reports ?? 0, icon: CheckCircle },
    { label: "Testigos Activos", value: data?.stats.activeDelegates ?? 0, icon: Users },
    { label: "Cobertura", value: data?.stats.coverage ?? 0, icon: Radio },
  ]

  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left - Title and Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0.4)",
                  "0 0 0 10px rgba(239, 68, 68, 0)",
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Radio className="w-6 h-6 text-destructive" />
            </motion.div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">WAR ROOM</h1>
              <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-medium animate-pulse">
                EN VIVO
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Centro de Comando Electoral</p>
          </div>
        </div>

        {/* Center - Stats */}
        <div className="flex items-center gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {loading ? "--" : stat.label === "Cobertura" ? `${stat.value}%` : Number(stat.value).toLocaleString("es-CO")}
                </p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right - Clock */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-foreground">
              {time
                ? time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '--:--:--'}
            </p>
            <p className="text-xs text-muted-foreground">
              {time
                ? time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
                : 'Cargando fecha'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
