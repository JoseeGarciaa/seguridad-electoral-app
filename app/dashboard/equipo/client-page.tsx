"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserCheck, UserX, Shield, RefreshCw, MapPin, Mail, Phone, Edit, Trash2, Table } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type TeamMember = {
  id: string
  name: string
  email: string
  phone: string | null
  municipality: string | null
  role: string
  status: string
  assignedPollingStations: number
  reportsSubmitted: number
  lastActive: string | null
  avatar: string | null
  documentNumber?: string | null
  document_number?: string | null
  department?: string | null
  departmentCode?: string | null
  department_code?: string | null
  municipalityCode?: string | null
  municipality_code?: string | null
  pollingStationCode?: string | null
  polling_station_code?: string | null
  pollingStationNumber?: number | null
  polling_station_number?: number | null
  pollingStationNumbers?: number[] | null
  polling_station_numbers?: number[] | null
  pollingStationId?: string | null
  polling_station_id?: string | null
  pollingStationName?: string | null
}

type TeamStats = {
  total: number
  active: number
  witnesses: number
  coordinators: number
}

type DepartmentOption = { code: string; name: string }
type MunicipalityOption = { code: string; name: string; departmentCode: string }
type PuestoOption = {
  id: string
  code: string
  name: string
  departmentCode: string
  municipalityCode: string
  department: string
  municipality: string
  address: string | null
  mesas: number
  total: number
  takenTables?: number[]
}

const roleLabels: Record<string, string> = {
  witness: "Testigo",
  coordinator: "Coordinador",
  mobilizer: "Movilizador",
  leader: "Líder",
  admin: "Admin",
}

const statusLabels: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  pending: "Pendiente",
}

const roleColors: Record<string, string> = {
  witness: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  coordinator: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  mobilizer: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  leader: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  admin: "bg-red-500/20 text-red-300 border-red-500/40",
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-300",
  inactive: "bg-zinc-500/20 text-zinc-200",
  pending: "bg-amber-500/20 text-amber-300",
}

const formatLastActive = (value: string | null) => {
  if (!value) return "Sin actividad"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin actividad"
  return date.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
}

function Loading() {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6 text-sm text-muted-foreground">Cargando equipo...</CardContent>
    </Card>
  )
}

function EquipoInner() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats>({ total: 0, active: 0, witnesses: 0, coordinators: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [creating, setCreating] = useState(false)
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])
  const [puestos, setPuestos] = useState<PuestoOption[]>([])
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
    documentNumber: "",
    phone: "",
    role: "witness",
    status: "active",
    municipality: "",
    department: "",
    departmentCode: "",
    municipalityCode: "",
    pollingStationId: "",
    pollingStationCode: "",
    pollingStationNumber: "",
    pollingStationNumbers: [] as string[],
  })

  const notifyError = (message: string) =>
    toast({ title: "Equipo", description: message })

  const notify = (title: string, description: string) =>
    toast({ title, description })

  const loadTeam = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/team", { cache: "no-store" })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setMembers(data.members ?? [])
      setStats(data.stats ?? { total: 0, active: 0, witnesses: 0, coordinators: 0 })
    } catch (err) {
      console.error(err)
      const message = "No se pudo cargar el equipo"
      setError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  useEffect(() => {
    if (!createOpen) return
    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/divipole/options", { cache: "no-store" })
        if (!res.ok) throw new Error("divipole")
        const data = await res.json()
        setDepartments(data.departments ?? [])
      } catch (err) {
        console.error(err)
        setDepartments([])
      }
    }
    loadDepartments()
  }, [createOpen])

  useEffect(() => {
    if (!editOpen) return
    if (departments.length > 0) return
    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/divipole/options", { cache: "no-store" })
        if (!res.ok) throw new Error("divipole")
        const data = await res.json()
        setDepartments(data.departments ?? [])
      } catch (err) {
        console.error(err)
        setDepartments([])
      }
    }
    loadDepartments()
  }, [editOpen, departments.length])

  useEffect(() => {
    if (!newMember.departmentCode) {
      setMunicipalities([])
      return
    }
    const loadMunicipalities = async () => {
      try {
        const res = await fetch(`/api/divipole/options?dept=${newMember.departmentCode}`, { cache: "no-store" })
        if (!res.ok) throw new Error("divipole")
        const data = await res.json()
        setMunicipalities(data.municipalities ?? [])
      } catch (err) {
        console.error(err)
        setMunicipalities([])
      }
    }
    loadMunicipalities()
  }, [newMember.departmentCode])

  // Fallback: if we only have the department name (from registros antiguos), infer the code once options arrive
  useEffect(() => {
    if (newMember.departmentCode || !newMember.department || departments.length === 0) return
    const match = departments.find((d) => d.name.toLowerCase() === newMember.department.toLowerCase())
    if (match) {
      setNewMember((prev) => ({
        ...prev,
        departmentCode: match.code,
      }))
    }
  }, [departments, newMember.department, newMember.departmentCode])

  // Fallback: infer municipality code by name when missing but department already selected
  useEffect(() => {
    if (!newMember.departmentCode || newMember.municipalityCode || !newMember.municipality || municipalities.length === 0)
      return
    const match = municipalities.find((m) => m.name.toLowerCase() === newMember.municipality.toLowerCase())
    if (match) {
      setNewMember((prev) => ({
        ...prev,
        municipalityCode: match.code,
      }))
    }
  }, [municipalities, newMember.municipality, newMember.municipalityCode, newMember.departmentCode])

  useEffect(() => {
    if (!newMember.departmentCode || !newMember.municipalityCode) {
      setPuestos([])
      return
    }
    const loadPuestos = async () => {
      try {
        const res = await fetch(
          `/api/divipole/options?dept=${newMember.departmentCode}&muni=${newMember.municipalityCode}`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error("divipole")
        const data = await res.json()
        setPuestos(data.puestos ?? [])
      } catch (err) {
        console.error(err)
        setPuestos([])
      }
    }
    loadPuestos()
  }, [newMember.departmentCode, newMember.municipalityCode])

  useEffect(() => {
    if (newMember.pollingStationId || !newMember.pollingStationCode) return
    const found = puestos.find((p) => p.code === newMember.pollingStationCode)
    if (found) {
      setNewMember((prev) => ({ ...prev, pollingStationId: found.id }))
    }
  }, [puestos, newMember.pollingStationCode, newMember.pollingStationId])

  const selectedPuesto = useMemo(
    () =>
      puestos.find((p) => p.id === newMember.pollingStationId) ??
      puestos.find((p) => p.code === newMember.pollingStationCode) ??
      null,
    [puestos, newMember.pollingStationCode, newMember.pollingStationId]
  )

  const mesaOptions = useMemo(() => {
    const total = selectedPuesto?.mesas ?? 0
    if (total <= 0) return []

    const taken = new Set((selectedPuesto?.takenTables ?? []).map((n) => Number(n)).filter((n) => Number.isInteger(n)))
    const currentNumbers = newMember.pollingStationNumbers
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n))
    const isEditingSamePuesto = selectedMember && selectedMember.pollingStationCode === selectedPuesto?.code
    if (isEditingSamePuesto) {
      currentNumbers.forEach((n) => taken.delete(n))
    }

    return Array.from({ length: total }, (_, i) => i + 1)
      .filter((num) => !taken.has(num))
      .map((num) => String(num))
  }, [selectedPuesto, newMember.pollingStationNumbers, selectedMember])

  const toggleMesa = (value: string) => {
    setNewMember((prev) => {
      const exists = prev.pollingStationNumbers.includes(value)
      const next = exists
        ? prev.pollingStationNumbers.filter((m) => m !== value)
        : [...prev.pollingStationNumbers, value].sort((a, b) => Number(a) - Number(b))
      return {
        ...prev,
        pollingStationNumbers: next,
        pollingStationNumber: next[0] ?? "",
      }
    })
  }

  const handleEditMember = async () => {
    if (!selectedMember) return
    setCreating(true)
    try {
      const pollingNumbers = Array.from(
        new Set(
          newMember.pollingStationNumbers
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && Number.isInteger(n))
        )
      )
      const pollingStationNumber = pollingNumbers[0] ?? null
      const changes: any = {
        full_name: newMember.name.trim(),
        email: newMember.email.trim(),
        phone: newMember.phone.trim() || null,
        role: newMember.role,
        status: newMember.status,
        polling_station_id: newMember.pollingStationId || null,
        department: newMember.department.trim() || null,
        municipality: newMember.municipality.trim() || null,
        department_code: newMember.departmentCode.trim() || null,
        municipality_code: newMember.municipalityCode.trim() || null,
        polling_station_code: newMember.pollingStationCode.trim() || null,
        polling_station_number: Number.isNaN(pollingStationNumber) ? null : pollingStationNumber,
        polling_station_numbers: pollingNumbers,
      }
      if (newMember.documentNumber.trim()) {
        changes.document_number = newMember.documentNumber.trim()
      }
      if (newMember.password.trim()) {
        changes.password = newMember.password.trim()
      }
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMember.id, changes }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify("Error", data?.error ?? "No se pudo actualizar")
        return
      }
      notify("Miembro actualizado", newMember.name.trim())
      setEditOpen(false)
      setSelectedMember(null)
      setNewMember({
        name: "",
        email: "",
        password: "",
        documentNumber: "",
        phone: "",
        role: "witness",
        status: "active",
        municipality: "",
        department: "",
        departmentCode: "",
        municipalityCode: "",
        pollingStationId: "",
        pollingStationCode: "",
        pollingStationNumber: "",
        pollingStationNumbers: [],
      })
      loadTeam()
    } catch (err) {
      console.error(err)
      notify("Error", "No se pudo actualizar")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return
    setCreating(true)
    try {
      const res = await fetch("/api/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMember.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        notify("Error", data?.error ?? "No se pudo eliminar")
        return
      }
      notify("Miembro eliminado", selectedMember.name)
      setDeleteOpen(false)
      setSelectedMember(null)
      loadTeam()
    } catch (err) {
      console.error(err)
      notify("Error", "No se pudo eliminar")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      notify("Faltan datos", "Nombre y correo son obligatorios")
      return
    }
    if (!newMember.password.trim() || newMember.password.length < 6) {
      notify("Contraseña requerida", "Mínimo 6 caracteres para permitir el login")
      return
    }
    if (!newMember.documentNumber.trim()) {
      notify("Falta documento", "El documento es obligatorio")
      return
    }
    if (!newMember.departmentCode || !newMember.municipalityCode || !newMember.pollingStationId) {
      notify("Faltan datos", "Selecciona departamento, municipio y puesto desde Divipole")
      return
    }

    const pollingNumbers = Array.from(
      new Set(
        newMember.pollingStationNumbers
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && Number.isInteger(n))
      )
    )
    if (pollingNumbers.length === 0) {
      notify("Faltan mesas", "Selecciona al menos una mesa disponible")
      return
    }

    const pollingStationNumber = pollingNumbers[0] ?? null

    const payload = {
      mode: "single",
      member: {
        full_name: newMember.name.trim(),
        document_number: newMember.documentNumber.trim(),
        email: newMember.email.trim(),
        password: newMember.password.trim(),
        phone: newMember.phone.trim() || null,
        role: newMember.role,
        polling_station_id: newMember.pollingStationId || null,
        municipality: newMember.municipality.trim() || null,
        department: newMember.department.trim() || null,
        department_code: newMember.departmentCode.trim() || null,
        municipality_code: newMember.municipalityCode.trim() || null,
        polling_station_code: newMember.pollingStationCode.trim() || null,
        polling_station_number: Number.isNaN(pollingStationNumber) ? null : pollingStationNumber,
        polling_station_numbers: pollingNumbers,
        status: newMember.status,
      },
    }

    setCreating(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        notify("Error", data?.error ?? "No se pudo crear")
        return
      }
      notify("Miembro creado", newMember.name.trim())
      setCreateOpen(false)
      setNewMember({
        name: "",
        email: "",
        password: "",
        documentNumber: "",
        phone: "",
        role: "witness",
        status: "active",
        municipality: "",
        department: "",
        departmentCode: "",
        municipalityCode: "",
        pollingStationId: "",
        pollingStationCode: "",
        pollingStationNumber: "",
        pollingStationNumbers: [],
      })
      loadTeam()
    } catch (err) {
      console.error(err)
      notify("Error", "No se pudo crear")
    } finally {
      setCreating(false)
    }
  }

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase()
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
  }, [members, roleFilter, search, statusFilter])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza el equipo operativo y su actividad reciente.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Crear miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl lg:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear miembro</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre completo</label>
                <Input
                  placeholder="Nombre completo"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Correo</label>
                <Input
                  placeholder="Correo"
                  value={newMember.email}
                  onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Contraseña</label>
                <Input
                  placeholder="Contraseña"
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Documento</label>
                <Input
                  placeholder="Documento"
                  value={newMember.documentNumber}
                  onChange={(e) => setNewMember((p) => ({ ...p, documentNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input
                  placeholder="Teléfono"
                  value={newMember.phone}
                  onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Departamento (Divipole)</label>
                <Select
                  value={newMember.departmentCode}
                  onValueChange={(value) => {
                    const dept = departments.find((d) => d.code === value)
                    setNewMember((p) => ({
                      ...p,
                      departmentCode: value,
                      department: dept?.name ?? "",
                      municipalityCode: "",
                      municipality: "",
                      pollingStationId: "",
                      pollingStationCode: "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                    }))
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Selecciona departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Municipio (Divipole)</label>
                <Select
                  value={newMember.municipalityCode}
                  onValueChange={(value) => {
                    const muni = municipalities.find((m) => m.code === value)
                    setNewMember((p) => ({
                      ...p,
                      municipalityCode: value,
                      municipality: muni?.name ?? "",
                      pollingStationId: "",
                      pollingStationCode: "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                    }))
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700" disabled={!newMember.departmentCode}>
                    <SelectValue placeholder="Selecciona municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Puesto de votación (Divipole)</label>
                <Select
                  value={newMember.pollingStationId}
                  onValueChange={(value) => {
                    const puesto = puestos.find((p) => p.id === value)
                    setNewMember((p) => ({
                      ...p,
                      pollingStationId: value,
                      pollingStationCode: puesto?.name ?? "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                      department: puesto?.department ?? p.department,
                      municipality: puesto?.municipality ?? p.municipality,
                    }))
                  }}
                >
                  <SelectTrigger
                    className="w-full bg-zinc-800/50 border-zinc-700"
                    disabled={!newMember.departmentCode || !newMember.municipalityCode}
                  >
                    <SelectValue placeholder="Selecciona puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {puestos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Dirección del puesto</label>
                <Input
                  placeholder="Dirección del puesto"
                  value={selectedPuesto?.address ?? ""}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cantidad de mesas</label>
                <Input
                  placeholder="Cantidad de mesas"
                  value={selectedPuesto?.mesas ? String(selectedPuesto.mesas) : ""}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mesas asignadas</label>
                {mesaOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin mesas disponibles en este puesto.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mesaOptions.map((m) => {
                      const active = newMember.pollingStationNumbers.includes(m)
                      return (
                        <Button
                          key={m}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-cyan-600 hover:bg-cyan-700" : "bg-zinc-800/50 border-zinc-700"}
                          onClick={() => toggleMesa(m)}
                        >
                          Mesa {m}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rol</label>
                <Select value={newMember.role} onValueChange={(value) => setNewMember((p) => ({ ...p, role: value }))}>
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="witness">Testigo</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estado</label>
                <Select value={newMember.status} onValueChange={(value) => setNewMember((p) => ({ ...p, status: value }))}>
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={handleCreateMember} disabled={creating}>
                {creating ? "Creando..." : "Crear"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-xl lg:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar miembro</DialogTitle>
              <DialogDescription>
                Modifica los datos del miembro. Deja la contraseña vacía si no deseas cambiarla.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre completo</label>
                <Input
                  placeholder="Nombre completo"
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Correo</label>
                <Input
                  placeholder="Correo"
                  value={newMember.email}
                  onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nueva contraseña (opcional)</label>
                <Input
                  placeholder="Dejar vacío para no cambiar"
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Documento</label>
                <Input
                  placeholder="Documento"
                  value={newMember.documentNumber}
                  onChange={(e) => setNewMember((p) => ({ ...p, documentNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Teléfono</label>
                <Input
                  placeholder="Teléfono"
                  value={newMember.phone}
                  onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Departamento (Divipole)</label>
                <Select
                  value={newMember.departmentCode}
                  onValueChange={(value) => {
                    const dept = departments.find((d) => d.code === value)
                    setNewMember((p) => ({
                      ...p,
                      departmentCode: value,
                      department: dept?.name ?? "",
                      municipalityCode: "",
                      municipality: "",
                      pollingStationId: "",
                      pollingStationCode: "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                    }))
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Selecciona departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Municipio (Divipole)</label>
                <Select
                  value={newMember.municipalityCode}
                  onValueChange={(value) => {
                    const muni = municipalities.find((m) => m.code === value)
                    setNewMember((p) => ({
                      ...p,
                      municipalityCode: value,
                      municipality: muni?.name ?? "",
                      pollingStationId: "",
                      pollingStationCode: "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                    }))
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700" disabled={!newMember.departmentCode}>
                    <SelectValue placeholder="Selecciona municipio" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipalities.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Puesto de votación (Divipole)</label>
                <Select
                  value={newMember.pollingStationId}
                  onValueChange={(value) => {
                    const puesto = puestos.find((p) => p.id === value)
                    setNewMember((p) => ({
                      ...p,
                      pollingStationId: value,
                      pollingStationCode: puesto?.name ?? "",
                      pollingStationNumber: "",
                      pollingStationNumbers: [],
                      department: puesto?.department ?? p.department,
                      municipality: puesto?.municipality ?? p.municipality,
                    }))
                  }}
                >
                  <SelectTrigger
                    className="w-full bg-zinc-800/50 border-zinc-700"
                    disabled={!newMember.departmentCode || !newMember.municipalityCode}
                  >
                    <SelectValue placeholder="Selecciona puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {puestos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Dirección del puesto</label>
                <Input
                  placeholder="Dirección del puesto"
                  value={selectedPuesto?.address ?? ""}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cantidad de mesas</label>
                <Input
                  placeholder="Cantidad de mesas"
                  value={selectedPuesto?.mesas ? String(selectedPuesto.mesas) : ""}
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mesas asignadas</label>
                {mesaOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin mesas disponibles en este puesto.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mesaOptions.map((m) => {
                      const active = newMember.pollingStationNumbers.includes(m)
                      return (
                        <Button
                          key={m}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className={active ? "bg-cyan-600 hover:bg-cyan-700" : "bg-zinc-800/50 border-zinc-700"}
                          onClick={() => toggleMesa(m)}
                        >
                          Mesa {m}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rol</label>
                <Select value={newMember.role} onValueChange={(value) => setNewMember((p) => ({ ...p, role: value }))}>
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="witness">Testigo</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Estado</label>
                <Select value={newMember.status} onValueChange={(value) => setNewMember((p) => ({ ...p, status: value }))}>
                  <SelectTrigger className="w-full bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={handleEditMember} disabled={creating}>
                {creating ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar miembro</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar a {selectedMember?.name}? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteMember} disabled={creating}>
                {creating ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <UserCheck className="h-5 w-5 text-emerald-400" />
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
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Shield className="h-5 w-5 text-amber-400" />
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
              <div className="p-2 rounded-lg bg-zinc-700/30">
                <UserX className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.coordinators}</p>
                <p className="text-xs text-muted-foreground">Coordinadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por nombre, email o municipio"
            className="bg-zinc-800/50 border-zinc-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="witness">Testigo</SelectItem>
              <SelectItem value="coordinator">Coordinador</SelectItem>
              <SelectItem value="mobilizer">Movilizador</SelectItem>
              <SelectItem value="leader">Líder</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="shrink-0" onClick={loadTeam}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <Loading />}

      {!loading && error && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && filteredMembers.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No se encontraron miembros con estos filtros.
          </CardContent>
        </Card>
      )}

      {!loading && !error && filteredMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const mesasAsignadas = member.pollingStationNumbers?.length
              ? member.pollingStationNumbers.join(", ")
              : null
            const puestoAsignado = (() => {
              const code = member.pollingStationCode ?? null
              const name = member.pollingStationName ?? null
              if (code && name) return `${code} - ${name}`
              return name ?? code ?? null
            })()
            return (
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
                      <Badge variant="outline" className={roleColors[member.role] ?? roleColors.witness}>
                        {roleLabels[member.role] ?? member.role}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={statusColors[member.status] ?? statusColors.pending}>
                    {statusLabels[member.status] ?? member.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{member.municipality ?? "Sin municipio"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone ?? "Sin teléfono"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Table className="h-4 w-4" />
                    <span>{puestoAsignado ? `Puesto ${puestoAsignado}` : "Sin puesto"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Mesas: </span>
                    <span className="text-foreground font-medium">{member.assignedPollingStations}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reportes: </span>
                    <span className="text-foreground font-medium">{member.reportsSubmitted}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Última actividad: {formatLastActive(member.lastActive)}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedMember(member)
                      setNewMember({
                        name: member.name,
                        email: member.email,
                        password: "",
                        documentNumber: member.documentNumber ?? member.document_number ?? "",
                        phone: member.phone || "",
                        role: member.role,
                        status: member.status,
                        municipality: member.municipality || "",
                        department: member.department || "",
                        pollingStationId: member.pollingStationId ?? member.polling_station_id ?? "",
                        departmentCode: member.departmentCode ?? member.department_code ?? "",
                        municipalityCode: member.municipalityCode ?? member.municipality_code ?? "",
                        pollingStationCode: member.pollingStationCode ?? member.polling_station_code ?? "",
                        pollingStationNumbers: (member.pollingStationNumbers ?? member.polling_station_numbers ?? [])
                          .filter((n): n is number => typeof n === "number" && Number.isInteger(n))
                          .map((n) => String(n)),
                        pollingStationNumber: (() => {
                          const nums = (member.pollingStationNumbers ?? member.polling_station_numbers ?? [])
                            .filter((n): n is number => typeof n === "number" && Number.isInteger(n))
                          if (nums.length) return String(nums[0])
                          if (typeof member.pollingStationNumber === "number") return String(member.pollingStationNumber)
                          if (member.polling_station_number) return String(member.polling_station_number)
                          return ""
                        })(),
                      })
                      setEditOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-400 hover:text-red-300"
                    onClick={() => {
                      setSelectedMember(member)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function EquipoClientPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EquipoInner />
    </Suspense>
  )
}
