"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Heart,
  CheckCircle,
  MapPin,
  UserPlus,
  Phone,
  Mail,
  Filter,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type Supporter = {
  id: string
  name: string
  municipality: string | null
  zone: string | null
  phone: string | null
  email: string | null
  commitment: number
  status: string
  channel: string
}

const statusColor: Record<string, string> = {
  confirmado: "bg-emerald-500/20 text-emerald-300",
  activo: "bg-cyan-500/20 text-cyan-300",
  "en validación": "bg-amber-500/20 text-amber-300",
  contactar: "bg-zinc-500/20 text-zinc-200",
};

export default function SimpatizantesClientPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("todos")
  const [municipality, setMunicipality] = useState("todos")
  const [items, setItems] = useState<Supporter[]>([])
  const [stats, setStats] = useState({ total: 0, confirmados: 0, activos: 0, porValidar: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    municipality: "",
    zone: "",
    phone: "",
    email: "",
    commitment: 50,
    status: "confirmado",
    channel: "voluntario",
  })

  const notify = () =>
    toast({
      title: "Registrar simpatizante",
      description: "Acción conectada al backend próximamente",
    })

  const recalcStats = (list: Supporter[]) => {
    setStats({
      total: list.length,
      confirmados: list.filter((s) => s.status === "confirmado").length,
      activos: list.filter((s) => s.status === "activo").length,
      porValidar: list.filter((s) => s.status === "en validación").length,
    })
  }

  const addSupporter = () => {
    if (!form.name) {
      toast({ title: "Falta nombre", description: "Agrega el nombre de la persona" })
      return
    }
    const newItem: Supporter = {
      id: `S-${Date.now()}`,
      name: form.name,
      municipality: form.municipality || null,
      zone: form.zone || null,
      phone: form.phone || null,
      email: form.email || null,
      commitment: Number(form.commitment) || 0,
      status: form.status,
      channel: form.channel,
    }
    const next = [newItem, ...items]
    setItems(next)
    recalcStats(next)
    setOpen(false)
    setForm({ name: "", municipality: "", zone: "", phone: "", email: "", commitment: 50, status: "confirmado", channel: "voluntario" })
    toast({ title: "Simpatizante registrado", description: newItem.name })
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/supporters", { cache: "no-store" })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!active) return
        setItems(data.items ?? [])
        setStats(data.stats ?? { total: 0, confirmados: 0, activos: 0, porValidar: 0 })
      } catch (err) {
        console.error(err)
        if (!active) return
        setError("No se pudieron cargar simpatizantes")
        setItems([])
        setStats({ total: 0, confirmados: 0, activos: 0, porValidar: 0 })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.municipality ?? "").toLowerCase().includes(q)
      const matchesStatus = status === "todos" || s.status === status
      const matchesMunicipality =
        municipality === "todos" || (s.municipality ?? "").toLowerCase() === municipality
      return matchesSearch && matchesStatus && matchesMunicipality
    })
  }, [items, municipality, search, status])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Simpatizantes</h1>
        <p className="text-sm text-muted-foreground">
          Segmenta y visualiza el avance de simpatizantes registrados. Datos mock, solo visual.
        </p>
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
                <Heart className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.confirmados}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activos}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.porValidar}</p>
                <p className="text-xs text-muted-foreground">En validación</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-sm text-muted-foreground">Cargando simpatizantes...</CardContent>
        </Card>
      )}
      {error && !loading && (
        <Card className="bg-zinc-900/50 border-red-900/60 border">
          <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Segmentación</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                  <UserPlus className="h-4 w-4 mr-2" /> Registrar simpatizante
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Nuevo simpatizante</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input
                    placeholder="Nombre"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Municipio"
                      value={form.municipality}
                      onChange={(e) => setForm((p) => ({ ...p, municipality: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      placeholder="Zona"
                      value={form.zone}
                      onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Teléfono"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="en validación">En validación</SelectItem>
                        <SelectItem value="contactar">Contactar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={form.channel} onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voluntario">Voluntario</SelectItem>
                        <SelectItem value="puerta a puerta">Puerta a puerta</SelectItem>
                        <SelectItem value="referido">Referido</SelectItem>
                        <SelectItem value="evento">Evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Compromiso %"
                    value={form.commitment}
                    onChange={(e) => setForm((p) => ({ ...p, commitment: Number(e.target.value) }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={addSupporter} className="bg-cyan-600 hover:bg-cyan-700">Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Buscar por nombre, email o municipio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 col-span-2"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="en validación">En validación</SelectItem>
              <SelectItem value="contactar">Contactar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={municipality} onValueChange={setMunicipality}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Municipio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="barranquilla">Barranquilla</SelectItem>
              <SelectItem value="soledad">Soledad</SelectItem>
              <SelectItem value="malambo">Malambo</SelectItem>
              <SelectItem value="galapa">Galapa</SelectItem>
              <SelectItem value="puerto colombia">Puerto Colombia</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Listado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <Badge className={statusColor[s.status]}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.id} · Canal: {s.channel}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.municipality} · Zona {s.zone}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>
                  </div>
                </div>
                <div className="min-w-[180px]">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Compromiso</span>
                    <span>{s.commitment}%</span>
                  </div>
                  <Progress value={s.commitment} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Embudo de compromiso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Contacto", "Interés", "Validación", "Confirmado"].map((stage, index) => {
              const progress = [100, 82, 64, 46][index];
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{stage}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Cifras simuladas para diseño. No altera el modelo actual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
