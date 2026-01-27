"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Shield, 
  LayoutDashboard, 
  Map, 
  Users, 
  Target,
  Camera,
  Bell,
  UserCircle,
  Settings,
  Calendar,
  CheckSquare,
  Heart,
  MessageSquare,
  FileCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useState } from "react"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  delegateId?: string | null
  profile?: {
    role_extended: string
  } | null
}

interface SidebarProps {
  user: User
}

const navigation = [
  { name: "Centro de Mando", href: "/dashboard", icon: LayoutDashboard },
  { name: "Territorio PRO", href: "/dashboard/territorio", icon: Map },
  { name: "War Room", href: "/dashboard/warroom", icon: Target },
  { name: "Equipo", href: "/dashboard/equipo", icon: Users },
  { name: "Asignaciones", href: "/dashboard/asignaciones", icon: UserCircle },
  { name: "Evidencias", href: "/dashboard/evidencias", icon: Camera },
  { name: "Simpatizantes", href: "/dashboard/simpatizantes", icon: Heart },
  { name: "Eventos", href: "/dashboard/eventos", icon: Calendar },
  { name: "Tareas", href: "/dashboard/tareas", icon: CheckSquare },
  { name: "Comunicación", href: "/dashboard/comunicacion", icon: MessageSquare },
  { name: "Alertas", href: "/dashboard/alertas", icon: Bell },
  { name: "Cumplimiento", href: "/dashboard/cumplimiento", icon: FileCheck },
]

const bottomNavigation = [
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
]

const witnessNavigation = [
  { name: "Registro de votos", href: "/dashboard/testigo", icon: CheckSquare },
  { name: "Carga E14", href: "/dashboard/testigo#e14", icon: Camera },
]

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const roleLabel = user.profile?.role_extended?.toLowerCase() ?? ""
  const isWitness = user.role === "witness" || roleLabel.includes("testigo")

  const restrictedForDelegate = new Set([
    "/dashboard/asignaciones",
    "/dashboard/simpatizantes",
    "/dashboard/equipo",
    "/dashboard/comunicacion",
  ])

  const isDelegate = !isWitness && (user.role === "delegate" || roleLabel.includes("delegado"))
  const baseNavigation = isWitness ? witnessNavigation : navigation
  const visibleNavigation = isDelegate
    ? baseNavigation.filter((item) => !restrictedForDelegate.has(item.href))
    : baseNavigation
  const visibleBottomNavigation = isWitness ? [] : bottomNavigation

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 blur-sm bg-primary/30" />
              </div>
              {!collapsed && (
                <span className="font-bold text-sm text-sidebar-foreground tracking-tight">
                  SEGURIDAD ELECTORAL
                </span>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {visibleNavigation.map((item) => {
              const hrefPath = item.href.split("#")[0]
              const isActive = pathname === hrefPath || (hrefPath !== "/dashboard" && pathname.startsWith(hrefPath))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="px-2 py-4 border-t border-sidebar-border space-y-1">
            {visibleBottomNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>

          {/* User Info */}
          {!collapsed && (
            <div className="px-4 py-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                  <span className="text-xs font-medium text-sidebar-accent-foreground">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.name || "Usuario"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user.profile?.role_extended || user.role}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-sidebar border-t border-sidebar-border">
        <div className="flex items-center justify-around py-2">
          {visibleNavigation.slice(0, 5).map((item) => {
            const hrefPath = item.href.split("#")[0]
            const isActive = pathname === hrefPath || (hrefPath !== "/dashboard" && pathname.startsWith(hrefPath))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/60"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.name.split(" ")[0]}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
