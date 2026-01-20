"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "@/components/ui/use-toast";

const teamMembers = [
  {
    id: 1,
    name: "Carlos Mendoza",
    role: "coordinator",
    zone: "Zona Norte",
    municipality: "Barranquilla",
    phone: "+57 300 123 4567",
    email: "carlos.mendoza@example.com",
    status: "active",
    assignedPollingStations: 12,
    reportsSubmitted: 45,
    lastActive: "Hace 5 min",
    avatar: null,
  },
  {
    id: 2,
    name: "Maria Rodriguez",
    role: "witness",
    zone: "Zona Centro",
    municipality: "Soledad",
    phone: "+57 301 234 5678",
    email: "maria.rodriguez@example.com",
    status: "active",
    assignedPollingStations: 3,
    reportsSubmitted: 28,
    lastActive: "Hace 15 min",
    avatar: null,
  },
  {
    id: 3,
    name: "Juan Perez",
    role: "witness",
    zone: "Zona Sur",
    municipality: "Malambo",
    phone: "+57 302 345 6789",
    email: "juan.perez@example.com",
    status: "inactive",
    assignedPollingStations: 2,
    reportsSubmitted: 12,
    lastActive: "Hace 2 horas",
    avatar: null,
  },
  {
    id: 4,
    name: "Ana Garcia",
    role: "mobilizer",
    zone: "Zona Norte",
    municipality: "Puerto Colombia",
    phone: "+57 303 456 7890",
    email: "ana.garcia@example.com",
    status: "active",
    assignedPollingStations: 0,
    reportsSubmitted: 67,
    lastActive: "Hace 30 min",
    avatar: null,
  },
  {
    id: 5,
    name: "Pedro Martinez",
    role: "leader",
    zone: "Zona Oriental",
    municipality: "Galapa",
    phone: "+57 304 567 8901",
    email: "pedro.martinez@example.com",
    status: "pending",
    assignedPollingStations: 8,
    reportsSubmitted: 89,
    lastActive: "Hace 1 hora",
    avatar: null,
  },
];

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

export default function EquipoPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Función en modo demo. Integración pendiente.",
    });

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.municipality.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter((m) => m.status === "active").length,
    witnesses: teamMembers.filter((m) => m.role === "witness").length,
    coordinators: teamMembers.filter((m) => m.role === "coordinator").length,
  };

  return (
    <Suspense fallback={<Loading />}>
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
                <DialogContent className="bg-zinc-900 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle>Agregar Nuevo Miembro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input placeholder="Nombre completo" className="bg-zinc-800/50 border-zinc-700" />
                    <Input placeholder="Email" type="email" className="bg-zinc-800/50 border-zinc-700" />
                    <Input placeholder="Teléfono" type="tel" className="bg-zinc-800/50 border-zinc-700" />
                    <Select>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="witness">Testigo Electoral</SelectItem>
                        <SelectItem value="coordinator">Coordinador</SelectItem>
                        <SelectItem value="mobilizer">Movilizador</SelectItem>
                        <SelectItem value="leader">Líder de Zona</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="norte">Zona Norte</SelectItem>
                        <SelectItem value="sur">Zona Sur</SelectItem>
                        <SelectItem value="centro">Zona Centro</SelectItem>
                        <SelectItem value="oriental">Zona Oriental</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => notify("Crear miembro")}
                    >
                      Crear Miembro
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

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
                        onClick={() => notify(`Ver perfil de ${member.name}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => notify(`Editar ${member.name}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-400"
                        onClick={() => notify(`Eliminar ${member.name}`)}
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
    </Suspense>
  );
}
