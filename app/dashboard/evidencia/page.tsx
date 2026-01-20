"use client";

import React from "react";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Camera,
  Upload,
  Search,
  Filter,
  ImageIcon,
  FileText,
  Video,
  MapPin,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "@/components/ui/use-toast";

const evidenceItems = [
  {
    id: 1,
    type: "image",
    title: "Acta Mesa 001 - Barranquilla",
    description: "Foto del acta de escrutinio mesa 001",
    municipality: "Barranquilla",
    pollingStation: "Mesa 001",
    uploadedBy: "Carlos Mendoza",
    uploadedAt: "2026-01-18 14:30",
    status: "verified",
    url: "/evidence/acta-001.jpg",
    tags: ["acta", "escrutinio"],
  },
  {
    id: 2,
    type: "image",
    title: "Irregularidad Mesa 045",
    description: "Evidencia de votantes sin cédula",
    municipality: "Soledad",
    pollingStation: "Mesa 045",
    uploadedBy: "Maria Rodriguez",
    uploadedAt: "2026-01-18 13:15",
    status: "pending",
    url: "/evidence/irregularidad-045.jpg",
    tags: ["irregularidad", "urgente"],
  },
  {
    id: 3,
    type: "video",
    title: "Video apertura Mesa 012",
    description: "Grabación del proceso de apertura",
    municipality: "Malambo",
    pollingStation: "Mesa 012",
    uploadedBy: "Juan Perez",
    uploadedAt: "2026-01-18 06:00",
    status: "verified",
    url: "/evidence/apertura-012.mp4",
    tags: ["apertura", "video"],
  },
  {
    id: 4,
    type: "document",
    title: "Reporte de incidente",
    description: "Documento formal de queja por intimidación",
    municipality: "Puerto Colombia",
    pollingStation: "Mesa 023",
    uploadedBy: "Ana Garcia",
    uploadedAt: "2026-01-18 11:45",
    status: "flagged",
    url: "/evidence/reporte-incidente.pdf",
    tags: ["incidente", "queja", "urgente"],
  },
  {
    id: 5,
    type: "image",
    title: "Cierre Mesa 089",
    description: "Foto del proceso de cierre y conteo",
    municipality: "Galapa",
    pollingStation: "Mesa 089",
    uploadedBy: "Pedro Martinez",
    uploadedAt: "2026-01-18 16:00",
    status: "pending",
    url: "/evidence/cierre-089.jpg",
    tags: ["cierre", "conteo"],
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  verified: { label: "Verificado", color: "bg-emerald-500/20 text-emerald-400" },
  pending: { label: "Pendiente", color: "bg-amber-500/20 text-amber-400" },
  flagged: { label: "Marcado", color: "bg-red-500/20 text-red-400" },
};

function Loading() {
  return null;
}

export default function EvidenciaPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Función en modo demo. Se conectará a backend próximamente.",
    });

  const filteredItems = evidenceItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.municipality.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: evidenceItems.length,
    images: evidenceItems.filter((e) => e.type === "image").length,
    videos: evidenceItems.filter((e) => e.type === "video").length,
    documents: evidenceItems.filter((e) => e.type === "document").length,
    verified: evidenceItems.filter((e) => e.status === "verified").length,
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
    setUploadDialogOpen(true);
  }, []);

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Camera className="h-5 w-5 text-cyan-400" />
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
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <ImageIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.images}</p>
                  <p className="text-xs text-muted-foreground">Imágenes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Video className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.videos}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.documents}</p>
                  <p className="text-xs text-muted-foreground">Documentos</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.verified}</p>
                  <p className="text-xs text-muted-foreground">Verificados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Zone */}
        <Card
          className={`bg-zinc-900/50 border-2 border-dashed transition-colors ${
            isDragging ? "border-cyan-500 bg-cyan-500/5" : "border-zinc-700"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-zinc-800">
                <Upload className="h-8 w-8 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Arrastra archivos aquí
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  O haz clic para seleccionar archivos (Fotos, Videos, PDFs)
                </p>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Subir Evidencia
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Subir Nueva Evidencia</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Haz clic o arrastra archivos aquí
                      </p>
                    </div>
                    <Input
                      placeholder="Título de la evidencia"
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Textarea
                      placeholder="Descripción detallada..."
                      className="bg-zinc-800/50 border-zinc-700 min-h-[100px]"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select>
                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                          <SelectValue placeholder="Municipio" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="barranquilla">Barranquilla</SelectItem>
                          <SelectItem value="soledad">Soledad</SelectItem>
                          <SelectItem value="malambo">Malambo</SelectItem>
                          <SelectItem value="puerto-colombia">Puerto Colombia</SelectItem>
                          <SelectItem value="galapa">Galapa</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Mesa (ej: 001)"
                        className="bg-zinc-800/50 border-zinc-700"
                      />
                    </div>
                    <Input
                      placeholder="Etiquetas (separadas por coma)"
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Button
                      className="w-full bg-cyan-600 hover:bg-cyan-700"
                      onClick={() => notify("Subir evidencia")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Evidencia
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar evidencia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <div className="flex gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="image">Imágenes</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="document">Documentos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="verified">Verificados</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="flagged">Marcados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evidence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
            >
              {/* Preview */}
              <div className="aspect-video bg-zinc-800 relative flex items-center justify-center">
                <div className="p-4 rounded-full bg-zinc-700/50">
                  {typeIcons[item.type]}
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className={statusConfig[item.status].color}>
                    {statusConfig[item.status].label}
                  </Badge>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700">
                    {item.type === "image"
                      ? "Imagen"
                      : item.type === "video"
                      ? "Video"
                      : "PDF"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-1 truncate">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>

                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {item.municipality} - {item.pollingStation}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{item.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{item.uploadedAt}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs bg-zinc-800/50 border-zinc-700"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent border-zinc-700 hover:bg-zinc-800"
                    onClick={() => notify(`Ver ${item.title}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-zinc-700 hover:bg-zinc-800"
                    onClick={() => notify(`Descargar ${item.title}`)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-red-400 hover:text-red-300"
                    onClick={() => notify(`Eliminar ${item.title}`)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No se encontró evidencia
              </h3>
              <p className="text-muted-foreground">
                Intenta ajustar los filtros o sube nueva evidencia
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Suspense>
  );
}
