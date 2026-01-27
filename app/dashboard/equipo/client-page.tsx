"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Shield,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";

type TeamMember = {
  id: string
  name: string
  role: string
  zone: string | null
  municipality: string | null
  phone: string | null
  email: string
  status: string
  assignedPollingStations: number
  reportsSubmitted: number
  lastActive: string | null
  avatar: string | null
}

type TeamStats = {
  total: number
  active: number
  witnesses: number
  coordinators: number
}

const roleLabels: Record<string, string> = {
  coordinator: "Coordinador",
  witness: "Testigo Electoral",
  mobilizer: "Movilizador",
  leader: "Líder de Zona",
  admin: "Administrador",
};

const roleColors: Record<string, string> = {
  coordinator: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  witness: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  mobilizer: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  leader: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-zinc-500/20 text-zinc-400",
  pending: "bg-amber-500/20 text-amber-400",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
};

function Loading() {
  return null;
}

function EquipoInner() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({ total: 0, active: 0, witnesses: 0, coordinators: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkCsv, setBulkCsv] = useState("")
  const [deptOptions, setDeptOptions] = useState<{ code: string; name: string }[]>([])
  const [muniOptions, setMuniOptions] = useState<{ code: string; name: string }[]>([])
  const [puestoOptions, setPuestoOptions] = useState<{
    id: string
    code: string
    name: string
    address: string | null
    mesas: number
  }[]>([])
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    documentNumber: "",
    phone: "",
    role: "witness",
    zone: "",
    municipality: "",
    department: "",
    departmentCode: "",
    municipalityCode: "",
    puestoCode: "",
    puestoName: "",
    supervisorEmail: "",
    status: "active",
    pollingStationCode: "",
    pollingStationNumbers: [] as string[],
  })
  const [viewMember, setViewMember] = useState<TeamMember | null>(null)
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "witness",
    status: "active",
    zone: "",
    municipality: "",
  })

  const notify = (action: string, description?: string) =>
    toast({
      title: action,
      description: description ?? "",
    })

  const openView = (member: TeamMember) => setViewMember(member)
  const openEdit = (member: TeamMember) => {
    setEditMember(member)
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      role: member.role,
      status: member.status,
      zone: member.zone ?? "",
      municipality: member.municipality ?? "",
    })
  }

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team", { cache: "no-store" })
      if (!res.ok) {
        setMembers([])
        setStats({ total: 0, active: 0, witnesses: 0, coordinators: 0 })
        setError("No se pudo cargar el equipo")
        return
      }
      const data = await res.json()
      setMembers(data.members ?? [])
      setStats(data.stats ?? { total: 0, active: 0, witnesses: 0, coordinators: 0 })
    } catch (err) {
      console.error(err)
      setError("No se pudo cargar el equipo")
      setMembers([])
      setStats({ total: 0, active: 0, witnesses: 0, coordinators: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEditSave = () => {
    if (!editMember) return
    updateMember(editMember.id, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      status: editForm.status,
      zone: editForm.zone,
      municipality: editForm.municipality,
    })
    notify("Perfil actualizado", editForm.name)
    setEditMember(null)
  }

  const handleViewClose = () => setViewMember(null)

  useEffect(() => {
    loadTeam()
  }, [loadTeam])

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch("/api/divipole/options")
        if (!res.ok) return
        const data = await res.json()
        setDeptOptions(data.departments ?? [])
      } catch (err) {
        console.error(err)
      }
    }
    loadDepts()
  }, [])

  useEffect(() => {
    const loadMunis = async () => {
      if (!newMember.departmentCode) {
        setMuniOptions([])
        setPuestoOptions([])
        return
      }
      try {
        const res = await fetch(`/api/divipole/options?dept=${encodeURIComponent(newMember.departmentCode)}`)
        if (!res.ok) return
        const data = await res.json()
        setMuniOptions(data.municipalities ?? [])
      } catch (err) {
        console.error(err)
      }
    }
    loadMunis()
  }, [newMember.departmentCode])

  useEffect(() => {
    const loadPuestos = async () => {
      if (!newMember.departmentCode || !newMember.municipalityCode) {
        setPuestoOptions([])
        return
      }
      try {
        const res = await fetch(
          `/api/divipole/options?dept=${encodeURIComponent(newMember.departmentCode)}&muni=${encodeURIComponent(newMember.municipalityCode)}`
        )
        if (!res.ok) return
        const data = await res.json()
        setPuestoOptions(
          (data.puestos ?? []).map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            address: p.address ?? null,
            mesas: Number(p.mesas ?? 0),
          }))
        )
      } catch (err) {
        console.error(err)
      }
    }
    loadPuestos()
  }, [newMember.departmentCode, newMember.municipalityCode])

  const selectedPuesto = useMemo(
    () => puestoOptions.find((p) => p.code === newMember.puestoCode || p.code === newMember.pollingStationCode) ?? null,
    [puestoOptions, newMember.puestoCode, newMember.pollingStationCode]
  )

  const mesaOptions = useMemo(() => {
    const total = selectedPuesto?.mesas ?? 0
    const bases = total > 0 ? Array.from({ length: total }, (_, i) => String(i + 1)) : []
    return bases
  }, [selectedPuesto])

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return members.filter((member) => {
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.municipality ?? "").toLowerCase().includes(q)
      const matchesRole = roleFilter === "all" || member.role === roleFilter
      const matchesStatus = statusFilter === "all" || member.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, roleFilter, searchQuery, statusFilter])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Equipo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.witnesses}</p>
                <p className="text-xs text-muted-foreground">Testigos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.coordinators}</p>
                <p className="text-xs text-muted-foreground">Coordinadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 text-sm text-muted-foreground">Cargando equipo...</CardContent>
        </Card>
      )}
      {error && !loading && (
        <Card className="bg-zinc-900/50 border-red-900/60 border">
          <CardContent className="p-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o municipio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="coordinator">Coordinador</SelectItem>
                  <SelectItem value="witness">Testigo</SelectItem>
                  <SelectItem value="mobilizer">Movilizador</SelectItem>
                  <SelectItem value="leader">Líder</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Miembro
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Miembro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Documento"
                      className="bg-zinc-800/50 border-zinc-700"
                      value={newMember.documentNumber}
                      onChange={(e) => setNewMember((p) => ({ ...p, documentNumber: e.target.value }))}
                    />
                    <Input
                      placeholder="Nombre completo"
                      className="bg-zinc-800/50 border-zinc-700"
                      value={newMember.name}
                      onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      className="bg-zinc-800/50 border-zinc-700"
                      value={newMember.email}
                      onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                    />
                    <Input
                      placeholder="Teléfono"
                      type="tel"
                      className="bg-zinc-800/50 border-zinc-700"
                      value={newMember.phone}
                      onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={newMember.departmentCode}
                      onValueChange={(value) =>
                        setNewMember((p) => ({
                          ...p,
                          departmentCode: value,
                          department: deptOptions.find((d) => d.code === value)?.name ?? "",
                          municipalityCode: "",
                          municipality: "",
                          puestoCode: "",
                          puestoName: "",
                          pollingStationNumbers: [],
                        }))
                      }
                    >
                      <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {deptOptions.map((d) => (
                          <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newMember.municipalityCode}
                      onValueChange={(value) =>
                        setNewMember((p) => ({
                          ...p,
                          municipalityCode: value,
                          municipality: muniOptions.find((m) => m.code === value)?.name ?? "",
                          puestoCode: "",
                          puestoName: "",
                          pollingStationNumbers: [],
                        }))
                      }
                      disabled={!newMember.departmentCode}
                    >
                      <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Municipio" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {muniOptions.map((m) => (
                          <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={newMember.puestoCode}
                      onValueChange={(value) =>
                        setNewMember((p) => ({
                          ...p,
                          puestoCode: value,
                          puestoName: puestoOptions.find((x) => x.code === value)?.name ?? "",
                          pollingStationCode: puestoOptions.find((x) => x.code === value)?.code ?? value,
                          pollingStationNumbers: [],
                        }))
                      }
                      disabled={!newMember.municipalityCode}
                    >
                      <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Código puesto / puesto" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <ScrollArea className="h-64">
                          {puestoOptions.map((p) => (
                            <SelectItem key={p.id} value={p.code}>
                              {p.code} - {p.name}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    {mesaOptions.length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-zinc-800/50 border-zinc-700 text-left"
                          >
                            {newMember.pollingStationNumbers.length > 0
                              ? `${newMember.pollingStationNumbers.length} mesa(s) seleccionadas`
                              : "Selecciona mesas"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          sideOffset={6}
                          className="p-0 bg-zinc-900 border-zinc-800 w-[min(360px,calc(100vw-3rem))]"
                        >
                          <div className="max-h-[320px] overflow-y-auto p-2 pr-3 space-y-2">
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex w-full items-center gap-2 px-2 py-2 rounded-md hover:bg-zinc-800/60 text-sm cursor-pointer"
                              onClick={() =>
                                setNewMember((p) => ({
                                  ...p,
                                  pollingStationNumbers:
                                    p.pollingStationNumbers.length === mesaOptions.length ? [] : mesaOptions,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {

                        const updateMember = (id: string, changes: Partial<TeamMember>) => {
                          setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))
                        }
                                  e.preventDefault()
                                  setNewMember((p) => ({
                                    ...p,
                                    pollingStationNumbers:
                                      p.pollingStationNumbers.length === mesaOptions.length ? [] : mesaOptions,
                                  }))
                                }
                              }}
                            >
                              <Checkbox
                                className="pointer-events-none"
                                checked={newMember.pollingStationNumbers.length === mesaOptions.length}
                                aria-hidden
                              />
                              <span className="truncate">Todas las mesas</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {mesaOptions.map((m) => {
                                const checked = newMember.pollingStationNumbers.includes(m)
                                return (
                                  <label
                                    key={m}
                                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-zinc-800/60 text-sm cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() =>
                                        setNewMember((p) => {
                                          const next = new Set(p.pollingStationNumbers)
                                          if (checked) {
                                            next.delete(m)
                                          } else {
                                            next.add(m)
                                          }
                                          return {
                                            ...p,
                                            pollingStationNumbers: Array.from(next).sort((a, b) => Number(a) - Number(b)),
                                          }
                                        })
                                      }
                                    />
                                    <span className="truncate">Mesa {m}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        placeholder="Mesa / número"
                        className="bg-zinc-800/50 border-zinc-700"
                        value={newMember.pollingStationNumbers.join(",")}
                        onChange={(e) =>
                          setNewMember((p) => ({
                            ...p,
                            pollingStationNumbers: e.target.value
                              .split(/[,\s]+/)
                              .map((v) => v.trim())
                              .filter(Boolean),
                          }))
                        }
                      />
                    )}
                  </div>
                  <Select value={newMember.role} onValueChange={(value) => setNewMember((p) => ({ ...p, role: value }))}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 w-full">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="witness">Testigo Electoral</SelectItem>
                      <SelectItem value="coordinator">Coordinador</SelectItem>
                      <SelectItem value="mobilizer">Movilizador</SelectItem>
                      <SelectItem value="leader">Líder de Zona</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Zona"
                    className="bg-zinc-800/50 border-zinc-700"
                    value={newMember.zone}
                    onChange={(e) => setNewMember((p) => ({ ...p, zone: e.target.value }))}
                  />
                  <Input
                    placeholder="Email del supervisor (opcional)"
                    className="bg-zinc-800/50 border-zinc-700"
                    value={newMember.supervisorEmail}
                    onChange={(e) => setNewMember((p) => ({ ...p, supervisorEmail: e.target.value }))}
                  />
                  <Select value={newMember.status} onValueChange={(value) => setNewMember((p) => ({ ...p, status: value }))}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 w-full">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                    disabled={creating}
                    onClick={async () => {
                      if (!newMember.name || !newMember.email) {
                        notify("Faltan datos", "Nombre y email son obligatorios")
                        return
                      }
                      if (!newMember.documentNumber) {
                        notify("Falta documento", "El documento es obligatorio")
                        return
                      }
                      if (!newMember.department || !newMember.municipality) {
                        notify("Faltan ubicación", "Departamento y municipio son obligatorios")
                        return
                      }
                      setCreating(true)
                      const pollingStationNumbers = newMember.pollingStationNumbers
                        .map((n) => Number(n))
                        .filter((n) => !Number.isNaN(n))
                      const payload = {
                        mode: "single",
                        member: {
                          full_name: newMember.name,
                          document_number: newMember.documentNumber,
                          email: newMember.email,
                          phone: newMember.phone || null,
                          role: newMember.role,
                          zone: newMember.zone || null,
                          municipality: newMember.municipality || null,
                          department: newMember.department || null,
                          department_code: newMember.departmentCode || null,
                          municipality_code: newMember.municipalityCode || null,
                          polling_station_code: newMember.pollingStationCode || newMember.puestoCode || null,
                          polling_station_number: pollingStationNumbers[0] ?? null,
                          polling_station_numbers: pollingStationNumbers,
                          supervisor_email: newMember.supervisorEmail || null,
                          status: newMember.status,
                        },
                      }
                      try {
                        const res = await fetch("/api/team", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        })
                        const data = await res.json()
                        if (!res.ok) {
                          notify("Error", data?.error ?? "No se pudo crear")
                        } else {
                          notify("Miembro creado", newMember.name)
                          setNewMember((p) => ({
                            ...p,
                            name: "",
                            email: "",
                            documentNumber: "",
                            phone: "",
                            municipality: "",
                            department: "",
                            departmentCode: "",
                            municipalityCode: "",
                            zone: "",
                            supervisorEmail: "",
                            pollingStationCode: "",
                            pollingStationNumbers: [],
                            puestoCode: "",
                            puestoName: "",
                          }))
                          loadTeam()
                        }
                      } catch (err) {
                        console.error(err)
                        notify("Error", "No se pudo crear")
                      } finally {
                        setCreating(false)
                      }
                    }}
                  >
                    {creating ? "Creando..." : "Crear Miembro"}
                  </Button>
                  <div className="space-y-2 border-t border-zinc-800 pt-4">
                    <p className="text-sm text-muted-foreground">Carga masiva (CSV con encabezados):</p>
                    <Input
                      placeholder="Pega CSV: email,full_name,document_number,phone,role,zone,municipality,department,department_code,municipality_code,supervisor_email,status,polling_station_code,polling_station_number"
                      className="bg-zinc-800/50 border-zinc-700"
                      value={bulkCsv}
                      onChange={(e) => setBulkCsv(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={bulkCreating}
                      onClick={async () => {
                        if (!bulkCsv.trim()) return
                        setBulkCreating(true)
                        const lines = bulkCsv
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean)
                        const rows = lines
                          .map((line) => line.split(",").map((p) => p.trim()))
                          .filter((parts) => parts.length >= 2)
                          .map((parts) => ({
                            email: parts[0] || null,
                            full_name: parts[1] || null,
                            document_number: parts[2] || null,
                            phone: parts[3] || null,
                            role: parts[4] || "witness",
                            zone: parts[5] || null,
                            municipality: parts[6] || null,
                            department: parts[7] || null,
                            department_code: parts[8] || null,
                            municipality_code: parts[9] || null,
                            supervisor_email: parts[10] || null,
                            status: parts[11] || "active",
                            polling_station_code: parts[12] || null,
                            polling_station_number: parts[13] ? Number(parts[13]) : null,
                          }))
                          .filter((row) => row.email && row.full_name && row.document_number)

                        try {
                          const res = await fetch("/api/team", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ mode: "bulk", rows }),
                          })
                          const data = await res.json()
                          if (!res.ok) {
                            notify("Error", data?.error ?? "No se pudo cargar")
                          } else {
                            notify("Carga masiva", `Insertados: ${data.inserted ?? rows.length}`)
                            setBulkCsv("")
                            loadTeam()
                          }
                        } catch (err) {
                          console.error(err)
                          notify("Error", "No se pudo cargar CSV")
                        } finally {
                          setBulkCreating(false)
                        }
                      }}
                    >
                      {bulkCreating ? "Cargando..." : "Subir CSV"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* View Member */}
      <Dialog open={!!viewMember} onOpenChange={handleViewClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewMember?.name}</DialogTitle>
          </DialogHeader>
          {viewMember && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">Correo:</span> {viewMember.email}</div>
              <div><span className="font-medium text-foreground">Teléfono:</span> {viewMember.phone || "No registrado"}</div>
              <div><span className="font-medium text-foreground">Rol:</span> {roleLabels[viewMember.role]}</div>
              <div><span className="font-medium text-foreground">Estado:</span> {statusLabels[viewMember.status]}</div>
              <div><span className="font-medium text-foreground">Zona:</span> {viewMember.zone || "Sin zona"}</div>
              <div><span className="font-medium text-foreground">Municipio:</span> {viewMember.municipality || "Sin municipio"}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar miembro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nombre</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Correo</label>
              <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Teléfono</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rol</label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Zona</label>
              <Input value={editForm.zone} onChange={(e) => setEditForm((f) => ({ ...f, zone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Municipio</label>
              <Input
                value={editForm.municipality}
                onChange={(e) => setEditForm((f) => ({ ...f, municipality: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card
            key={member.id}
            className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-zinc-700">
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback className="bg-zinc-800 text-foreground">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <Badge
                      variant="outline"
                      className={roleColors[member.role]}
                    >
                      {roleLabels[member.role]}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem
                      className="cursor-pointer"
                        onClick={() => openView(member)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                        onClick={() => openEdit(member)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-400"
                      onClick={() => updateMember(member.id, { status: "inactive" })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {member.zone} - {member.municipality}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Mesas: </span>
                    <span className="text-foreground font-medium">
                      {member.assignedPollingStations}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reportes: </span>
                    <span className="text-foreground font-medium">
                      {member.reportsSubmitted}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusColors[member.status]}>
                    {statusLabels[member.status]}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{member.lastActive}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron miembros
            </h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros de búsqueda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function EquipoClientPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EquipoInner />
    </Suspense>
  );
}
