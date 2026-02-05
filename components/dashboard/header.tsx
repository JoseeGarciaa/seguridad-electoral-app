"use client"

import { Bell, Search, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/app/actions/auth"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  profile?: {
    role_extended: string
  } | null
}

interface HeaderProps {
  user: User
}

type HeaderAlert = {
  id: string
  title: string
  level: "crítica" | "alta" | "media"
  category: string
  municipality: string
  time: string | null
  status: "abierta" | "en análisis" | "enviada"
  detail: string
}

export function DashboardHeader({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [alerts, setAlerts] = useState<HeaderAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const pathname = usePathname()
  const roleLabel = user.profile?.role_extended?.toLowerCase() ?? ""
  const isWitness = user.role === "witness" || roleLabel.includes("testigo")

  useEffect(() => {
    let cancelled = false
    const loadAlerts = async () => {
      setAlertsLoading(true)
      try {
        const res = await fetch("/api/alerts?limit=5", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudieron cargar alertas")
        const json = await res.json()
        if (cancelled) return
        setAlerts(Array.isArray(json.items) ? json.items : [])
      } catch (err) {
        if (!cancelled) setAlerts([])
      } finally {
        if (!cancelled) setAlertsLoading(false)
      }
    }
    loadAlerts()
    return () => {
      cancelled = true
    }
  }, [])

  const unreadCount = useMemo(() => alerts.length, [alerts])

  // Get current page title
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Centro de Mando"
    if (pathname.includes("territorio")) return "Territorio PRO"
    if (pathname.includes("warroom")) return "War Room"
    if (pathname.includes("equipo")) return "Equipo"
    if (pathname.includes("asignaciones")) return "Asignaciones"
    if (pathname.includes("evidencias")) return "Evidencias"
    if (pathname.includes("testigo")) return "Testigo Electoral"
    if (pathname.includes("simpatizantes")) return "Simpatizantes"
    if (pathname.includes("comunicacion")) return "Comunicación"
    if (pathname.includes("alertas")) return "Alertas"
    if (pathname.includes("cumplimiento")) return "Cumplimiento"
    if (pathname.includes("settings")) return "Configuración"
    return "Dashboard"
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Mobile Menu Button & Page Title */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div>
              <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Bienvenido, {user.name || "Usuario"}
              </p>
            </div>
          </div>

          {/* Search (Desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar puestos, usuarios, eventos..."
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs font-medium text-primary">EN VIVO</span>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alertsLoading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Cargando notificaciones...
                  </div>
                )}
                {!alertsLoading && alerts.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay notificaciones nuevas
                  </div>
                )}
                {!alertsLoading && alerts.length > 0 && (
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.map((alert) => (
                      <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1">
                        <span className="text-sm font-medium text-foreground">
                          {alert.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {alert.detail || alert.municipality}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {alert.time ? new Date(alert.time).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : ""}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Configuración</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => await logout()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-background border-b border-border p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar..."
                className="pl-10 bg-secondary/50 border-border/50"
              />
            </div>
            <nav className="space-y-1">
              {(isWitness
                ? [
                    { name: "Registro de votos", href: "/dashboard/testigo" },
                    { name: "Carga E14", href: "/dashboard/testigo#e14" },
                  ]
                : [
                    { name: "Centro de Mando", href: "/dashboard" },
                    { name: "Territorio PRO", href: "/dashboard/territorio" },
                    { name: "Equipo", href: "/dashboard/equipo" },
                    { name: "Evidencias", href: "/dashboard/evidencias" },
                    { name: "Alertas", href: "/dashboard/alertas" },
                  ]).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
