"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Users, Target, RefreshCw, Plus } from "lucide-react";

type CandidateOption = {
  id: string;
  nombre: string;
};

type Leader = {
  id: string;
  candidate_id: string;
  candidate_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department_code: string | null;
  municipality_code: string | null;
  department_name: string | null;
  municipality_name: string | null;
  promised_votes_total: number;
  commitments_count: number;
  assigned_votes_total: number;
  assigned_witnesses_total: number;
  admin_commitments_count: number;
};

type Commitment = {
  id: string;
  candidate_id: string;
  title: string;
  status: string;
};

type LeaderPromise = {
  commitment_id: string;
  promised_votes: number;
  title: string;
  status: string;
};

type CommuneOption = {
  comuna: string;
  municipio: string;
  department_code: string | null;
  municipality_code: string | null;
  voters_current: number;
  tables_current: number;
};

type LeaderCommuneAssignment = {
  assignment_id: string;
  commune_id: string;
  commune_name: string;
  divipole_comuna: string | null;
  municipality_code: string;
  municipality_name: string | null;
  department_code: string | null;
  department_name: string | null;
  assigned_votes: number;
  assigned_witnesses: number;
  status: string;
  voters_current: number;
  tables_current: number;
};

const emptyLeaderForm = {
  candidate_id: "",
  full_name: "",
  email: "",
  phone: "",
  department_code: "",
  municipality_code: "",
};

const emptyCommitmentForm = {
  candidate_id: "",
  title: "",
  description: "",
};

export default function LideresAdminPage() {
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [search, setSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");

  const [createLeaderOpen, setCreateLeaderOpen] = useState(false);
  const [createCommitmentOpen, setCreateCommitmentOpen] = useState(false);
  const [leaderForm, setLeaderForm] = useState(emptyLeaderForm);
  const [commitmentForm, setCommitmentForm] = useState(emptyCommitmentForm);

  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [promises, setPromises] = useState<LeaderPromise[]>([]);
  const [promiseCommitmentId, setPromiseCommitmentId] = useState("");
  const [promiseVotes, setPromiseVotes] = useState("0");
  const [availableCommunes, setAvailableCommunes] = useState<CommuneOption[]>([]);
  const [leaderCommunes, setLeaderCommunes] = useState<LeaderCommuneAssignment[]>([]);
  const [communeSearch, setCommuneSearch] = useState("");
  const [selectedCommuneValue, setSelectedCommuneValue] = useState("");
  const [assignedVotes, setAssignedVotes] = useState("0");
  const [assignedWitnesses, setAssignedWitnesses] = useState("0");
  const [assignmentStatus, setAssignmentStatus] = useState("active");

  const selectedLeader = useMemo(
    () => leaders.find((leader) => leader.id === selectedLeaderId) ?? null,
    [leaders, selectedLeaderId],
  );

  const stats = useMemo(() => {
    const total = leaders.length;
    const promisedVotes = leaders.reduce((sum, leader) => sum + Number(leader.promised_votes_total ?? 0), 0);
    const withContact = leaders.filter((leader) => leader.email || leader.phone).length;
    return { total, promisedVotes, withContact };
  }, [leaders]);

  const loadCatalogs = async () => {
    const res = await fetch("/api/catalogos");
    if (!res.ok) throw new Error("No se pudieron cargar catálogos");
    const data = await res.json();
    const mapped = Array.isArray(data?.candidatos)
      ? data.candidatos.map((candidate: any) => ({ id: String(candidate.id), nombre: String(candidate.nombre ?? "Sin nombre") }))
      : [];
    setCandidates(mapped);
  };

  const loadCommitments = async () => {
    const res = await fetch("/api/commitments");
    if (!res.ok) throw new Error("No se pudieron cargar compromisos");
    const data = await res.json();
    setCommitments(Array.isArray(data) ? data : []);
  };

  const loadLeaders = async () => {
    const query = new URLSearchParams();
    if (candidateFilter !== "all") query.set("candidate_id", candidateFilter);
    if (search.trim()) query.set("search", search.trim());

    const res = await fetch(`/api/leaders?${query.toString()}`);
    if (!res.ok) throw new Error("No se pudieron cargar líderes");
    const data = await res.json();
    setLeaders(Array.isArray(data) ? data : []);
  };

  const loadAvailableCommunes = async (searchValue = "") => {
    const query = new URLSearchParams();
    if (searchValue.trim()) query.set("search", searchValue.trim());

    const res = await fetch(`/api/leaders/communes?${query.toString()}`);
    if (!res.ok) throw new Error("No se pudieron cargar comunas de Norte de Santander");
    const data = await res.json();
    setAvailableCommunes(Array.isArray(data) ? data : []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadCommitments(), loadLeaders(), loadAvailableCommunes()]);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Líderes", description: error?.message ?? "Error cargando módulo" });
    } finally {
      setLoading(false);
    }
  };

  const loadPromises = async (leaderId: string) => {
    try {
      const res = await fetch(`/api/leaders/${leaderId}/promises`);
      if (!res.ok) throw new Error("No se pudieron cargar promesas del líder");
      const data = await res.json();
      setPromises(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      setPromises([]);
      toast({ title: "Promesas", description: error?.message ?? "Error cargando promesas" });
    }
  };

  const loadLeaderCommunes = async (leaderId: string) => {
    try {
      const res = await fetch(`/api/leaders/${leaderId}/communes`);
      if (!res.ok) throw new Error("No se pudieron cargar comunas asignadas");
      const data = await res.json();
      setLeaderCommunes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      setLeaderCommunes([]);
      toast({ title: "Comunas", description: error?.message ?? "Error cargando comunas asignadas" });
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      loadLeaders().catch((error) => {
        console.error(error);
        toast({ title: "Líderes", description: "No se pudo actualizar el listado" });
      });
    }, 250);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, candidateFilter]);

  useEffect(() => {
    if (!selectedLeaderId) {
      setPromises([]);
      setLeaderCommunes([]);
      return;
    }
    Promise.all([loadPromises(selectedLeaderId), loadLeaderCommunes(selectedLeaderId)]);
  }, [selectedLeaderId]);

  useEffect(() => {
    const id = setTimeout(() => {
      loadAvailableCommunes(communeSearch).catch((error) => {
        console.error(error);
        toast({ title: "Comunas", description: "No se pudo actualizar la búsqueda de comunas" });
      });
    }, 250);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communeSearch]);

  const handleCreateLeader = async () => {
    if (!leaderForm.candidate_id || !leaderForm.full_name.trim()) {
      toast({ title: "Líderes", description: "Candidato y nombre completo son obligatorios" });
      return;
    }

    try {
      const res = await fetch("/api/leaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leaderForm,
          full_name: leaderForm.full_name.trim(),
          email: leaderForm.email.trim() || null,
          phone: leaderForm.phone.trim() || null,
          department_code: leaderForm.department_code.trim() || null,
          municipality_code: leaderForm.municipality_code.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el líder");

      toast({ title: "Líderes", description: "Líder creado correctamente" });
      setCreateLeaderOpen(false);
      setLeaderForm(emptyLeaderForm);
      await loadLeaders();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Líderes", description: error?.message ?? "Error creando líder" });
    }
  };

  const handleCreateCommitment = async () => {
    if (!commitmentForm.candidate_id || !commitmentForm.title.trim()) {
      toast({ title: "Compromisos", description: "Candidato y título son obligatorios" });
      return;
    }

    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: commitmentForm.candidate_id,
          title: commitmentForm.title.trim(),
          description: commitmentForm.description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear compromiso");

      toast({ title: "Compromisos", description: "Compromiso creado" });
      setCreateCommitmentOpen(false);
      setCommitmentForm(emptyCommitmentForm);
      await loadCommitments();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Compromisos", description: error?.message ?? "Error creando compromiso" });
    }
  };

  const handleSavePromise = async () => {
    if (!selectedLeaderId) {
      toast({ title: "Promesas", description: "Selecciona un líder" });
      return;
    }
    if (!promiseCommitmentId) {
      toast({ title: "Promesas", description: "Selecciona un compromiso" });
      return;
    }

    const promised_votes = Number(promiseVotes);
    if (!Number.isInteger(promised_votes) || promised_votes < 0) {
      toast({ title: "Promesas", description: "Los votos prometidos deben ser entero >= 0" });
      return;
    }

    try {
      const res = await fetch(`/api/leaders/${selectedLeaderId}/promises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment_id: promiseCommitmentId, promised_votes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar promesa");

      toast({ title: "Promesas", description: "Promesa guardada" });
      await Promise.all([loadPromises(selectedLeaderId), loadLeaders()]);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Promesas", description: error?.message ?? "Error guardando promesa" });
    }
  };

  const handleSaveCommuneAssignment = async () => {
    if (!selectedLeaderId) {
      toast({ title: "Comunas", description: "Selecciona un líder" });
      return;
    }
    if (!selectedCommuneValue) {
      toast({ title: "Comunas", description: "Selecciona una comuna" });
      return;
    }

    const parts = selectedCommuneValue.split("||");
    if (parts.length !== 2) {
      toast({ title: "Comunas", description: "Formato de comuna inválido" });
      return;
    }

    const assigned_votes = Number(assignedVotes);
    const assigned_witnesses = Number(assignedWitnesses);
    if (!Number.isInteger(assigned_votes) || assigned_votes < 0) {
      toast({ title: "Comunas", description: "Los votos asignados deben ser entero >= 0" });
      return;
    }
    if (!Number.isInteger(assigned_witnesses) || assigned_witnesses < 0) {
      toast({ title: "Comunas", description: "Los testigos asignados deben ser entero >= 0" });
      return;
    }

    try {
      const res = await fetch(`/api/leaders/${selectedLeaderId}/communes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipio: parts[0],
          comuna: parts[1],
          assigned_votes,
          assigned_witnesses,
          status: assignmentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar asignación de comuna");

      toast({ title: "Comunas", description: "Comuna enlazada al líder" });
      await Promise.all([loadLeaderCommunes(selectedLeaderId), loadLeaders()]);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Comunas", description: error?.message ?? "Error guardando asignación" });
    }
  };

  const handleRemoveCommuneAssignment = async (communeId: string) => {
    if (!selectedLeaderId) return;

    try {
      const res = await fetch(`/api/leaders/${selectedLeaderId}/communes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commune_id: communeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo quitar la comuna");

      toast({ title: "Comunas", description: "Comuna desvinculada del líder" });
      await Promise.all([loadLeaderCommunes(selectedLeaderId), loadLeaders()]);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Comunas", description: error?.message ?? "Error eliminando asignación" });
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Administración de Líderes</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de líderes, compromisos de candidato y votos prometidos por líder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Líderes registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.promisedVotes}</p>
              <p className="text-xs text-muted-foreground">Votos prometidos (total)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.withContact}</p>
              <p className="text-xs text-muted-foreground">Líderes con contacto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros y acciones</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Buscar por nombre, correo o teléfono"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-zinc-800/50 border-zinc-700"
          />

          <Select value={candidateFilter} onValueChange={setCandidateFilter}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Filtrar por candidato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los candidatos</SelectItem>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={createLeaderOpen} onOpenChange={setCreateLeaderOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Nuevo líder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear líder</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Candidato</Label>
                  <Select
                    value={leaderForm.candidate_id}
                    onValueChange={(value) => setLeaderForm((prev) => ({ ...prev, candidate_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona candidato" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nombre completo</Label>
                  <Input
                    value={leaderForm.full_name}
                    onChange={(event) => setLeaderForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Correo</Label>
                  <Input
                    value={leaderForm.email}
                    onChange={(event) => setLeaderForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input
                    value={leaderForm.phone}
                    onChange={(event) => setLeaderForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Código depto (opcional)</Label>
                    <Input
                      value={leaderForm.department_code}
                      onChange={(event) => setLeaderForm((prev) => ({ ...prev, department_code: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Código muni (opcional)</Label>
                    <Input
                      value={leaderForm.municipality_code}
                      onChange={(event) => setLeaderForm((prev) => ({ ...prev, municipality_code: event.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateLeader} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Guardar líder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createCommitmentOpen} onOpenChange={setCreateCommitmentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Nuevo compromiso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear compromiso de candidato</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Candidato</Label>
                  <Select
                    value={commitmentForm.candidate_id}
                    onValueChange={(value) => setCommitmentForm((prev) => ({ ...prev, candidate_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona candidato" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input
                    value={commitmentForm.title}
                    onChange={(event) => setCommitmentForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Descripción</Label>
                  <Input
                    value={commitmentForm.description}
                    onChange={(event) => setCommitmentForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateCommitment} className="w-full">
                  Guardar compromiso
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Recargar
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Listado de líderes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando líderes...</p>
            ) : leaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin líderes para los filtros actuales.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Líder</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Promesas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaders.map((leader) => {
                    const isActive = selectedLeaderId === leader.id;
                    return (
                      <TableRow
                        key={leader.id}
                        className={isActive ? "bg-zinc-800/40" : "cursor-pointer"}
                        onClick={() => setSelectedLeaderId(leader.id)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{leader.full_name}</span>
                            <span className="text-xs text-muted-foreground">{leader.email ?? "Sin correo"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{leader.candidate_name ?? "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[leader.department_name, leader.municipality_name].filter(Boolean).join(" / ") || "Sin ubicación"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">{leader.commitments_count} compromisos</Badge>
                            <Badge className="bg-amber-500/20 text-amber-200">{leader.promised_votes_total} votos</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Detalle administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedLeader ? (
              <p className="text-sm text-muted-foreground">Selecciona un líder para ver y asignar sus promesas.</p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{selectedLeader.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLeader.email ?? "Sin correo"}</p>
                  <p className="text-xs text-muted-foreground">{selectedLeader.phone ?? "Sin teléfono"}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge variant="outline">Votos promesa: {selectedLeader.promised_votes_total}</Badge>
                  <Badge variant="outline">Compromisos: {selectedLeader.commitments_count}</Badge>
                  <Badge variant="outline">Votos asignados: {selectedLeader.assigned_votes_total}</Badge>
                  <Badge variant="outline">Testigos asignados: {selectedLeader.assigned_witnesses_total}</Badge>
                </div>

                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <Label>Enlazar comuna (Norte de Santander)</Label>
                  <p className="text-xs text-muted-foreground">
                    Comunas disponibles: {availableCommunes.length}
                  </p>
                  <Input
                    placeholder="Buscar comuna o municipio"
                    value={communeSearch}
                    onChange={(event) => setCommuneSearch(event.target.value)}
                  />
                  <Select value={selectedCommuneValue} onValueChange={setSelectedCommuneValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona comuna" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCommunes.map((option) => {
                        const value = `${option.municipio}||${option.comuna}`;
                        return (
                          <SelectItem key={value} value={value}>
                            {option.municipio} / {option.comuna}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={assignedVotes}
                      onChange={(event) => setAssignedVotes(event.target.value)}
                      placeholder="Votos"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={assignedWitnesses}
                      onChange={(event) => setAssignedWitnesses(event.target.value)}
                      placeholder="Testigos"
                    />
                    <Select value={assignmentStatus} onValueChange={setAssignmentStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="paused">Pausada</SelectItem>
                        <SelectItem value="closed">Cerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveCommuneAssignment} className="w-full" variant="secondary">
                    Guardar enlace de comuna
                  </Button>
                </div>

                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <Label>Asignar/editar promesa</Label>
                  <Select value={promiseCommitmentId} onValueChange={setPromiseCommitmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Compromiso" />
                    </SelectTrigger>
                    <SelectContent>
                      {commitments
                        .filter((commitment) => commitment.candidate_id === selectedLeader.candidate_id)
                        .map((commitment) => (
                          <SelectItem key={commitment.id} value={commitment.id}>
                            {commitment.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={promiseVotes}
                    onChange={(event) => setPromiseVotes(event.target.value)}
                    placeholder="Votos prometidos"
                  />
                  <Button onClick={handleSavePromise} className="w-full">
                    Guardar promesa
                  </Button>
                </div>

                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <Label>Comunas enlazadas</Label>
                  {leaderCommunes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin comunas enlazadas para este líder.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {leaderCommunes.map((assignment) => (
                        <div key={assignment.assignment_id} className="rounded-lg border border-zinc-800 p-2">
                          <p className="text-sm text-foreground">
                            {(assignment.municipality_name ?? assignment.municipality_code) + " / " + assignment.commune_name}
                          </p>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {assignment.assigned_votes} votos · {assignment.assigned_witnesses} testigos
                            </span>
                            <span>{assignment.status}</span>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-300 hover:text-rose-200"
                              onClick={() => handleRemoveCommuneAssignment(assignment.commune_id)}
                            >
                              Quitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  <Label>Promesas registradas</Label>
                  {promises.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin promesas para este líder.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-auto pr-1">
                      {promises.map((promise) => (
                        <div key={promise.commitment_id} className="rounded-lg border border-zinc-800 p-2">
                          <p className="text-sm text-foreground">{promise.title}</p>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Estado: {promise.status}</span>
                            <span>{promise.promised_votes} votos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
