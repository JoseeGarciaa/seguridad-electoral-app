"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Key,
  Save,
  Upload,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";

export default function ConfiguracionPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    alerts: true,
    reports: true,
    updates: false,
  });
  const [assignments, setAssignments] = useState<
    Array<{
      id: string
      puesto?: string | null
      municipio?: string | null
      departamento?: string | null
      mesas?: number | string | null
    }>
  >([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción simulada. Integración pendiente.",
    });

  useEffect(() => {
    let cancelled = false
    const loadAssignments = async () => {
      setAssignmentsLoading(true)
      try {
        const res = await fetch("/api/my/assignments", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudo cargar tu asignación")
        const json = await res.json()
        if (cancelled) return
        const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
        const mapped = items.map((m: any) => ({
          id: String(m.id ?? `${Date.now()}-${Math.random()}`),
          puesto: m.puesto ?? m.polling_station_code ?? m.divipole_code ?? null,
          municipio: m.municipio ?? m.municipality ?? null,
          departamento: m.departamento ?? m.department ?? null,
          mesas: m.mesas ?? m.mesas_asignadas ?? m.mesas_count ?? null,
        }))
        setAssignments(mapped)
      } catch (err: any) {
        console.error(err)
        if (!cancelled) toast({ title: "Asignación", description: err?.message ?? "No se pudo cargar" })
      } finally {
        if (!cancelled) setAssignmentsLoading(false)
      }
    }
    loadAssignments()
    return () => {
      cancelled = true
    }
  }, [])

  const assignment = useMemo(() => assignments[0] ?? null, [assignments])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias del sistema
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-zinc-800/50 border border-zinc-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-zinc-700">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="campaign" className="data-[state=active]:bg-zinc-700">
            <Building2 className="h-4 w-4 mr-2" />
            Campaña
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-zinc-700">
            <Bell className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-zinc-700">
            <Shield className="h-4 w-4 mr-2" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-zinc-700">
            <Database className="h-4 w-4 mr-2" />
            Integraciones
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Actualiza tu información de perfil y foto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-2 border-zinc-700">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-zinc-800 text-2xl">CM</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="bg-transparent border-zinc-700"
                    onClick={() => notify("Cambiar foto")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar Foto
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o GIF. Máximo 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    defaultValue="Carlos"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    defaultValue="Mendoza"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="carlos.mendoza@example.com"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    defaultValue="+57 300 123 4567"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol en la Campaña</Label>
                <Select defaultValue="coordinator">
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="coordinator">Coordinador General</SelectItem>
                    <SelectItem value="zone-leader">Líder de Zona</SelectItem>
                    <SelectItem value="analyst">Analista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => notify("Guardar perfil")}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-900 text-white border border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Asignación electoral</span>
                <Badge className="bg-white/15 text-white border-white/20">Delegado</Badge>
              </CardTitle>
              <CardDescription className="text-white/70">
                Puesto y mesas asignadas a tu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignmentsLoading && (
                <p className="text-sm text-white/70">Cargando asignación...</p>
              )}
              {!assignmentsLoading && !assignment && (
                <p className="text-sm text-white/80">Sin asignación registrada.</p>
              )}
              {!assignmentsLoading && assignment && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Puesto de votación</p>
                    <p className="text-lg font-semibold">{assignment.puesto ?? "No asignado"}</p>
                    <p className="text-xs text-white/50">{assignment.municipio ?? "Municipio no definido"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Departamento</p>
                    <p className="text-lg font-semibold">{assignment.departamento ?? ""}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs text-white/60">Mesas asignadas</p>
                    <p className="text-lg font-semibold">{assignment.mesas ?? "Sin mesas"}</p>
                    <p className="text-xs text-white/50">Verifica tus mesas antes de reportar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Tab */}
        <TabsContent value="campaign" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Información de la Campaña</CardTitle>
              <CardDescription>
                Configura los datos de tu campaña electoral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Nombre de la Campaña</Label>
                  <Input
                    id="campaignName"
                    defaultValue="Campaña Atlántico 2026"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate">Candidato</Label>
                  <Input
                    id="candidate"
                    defaultValue="Juan Rodríguez"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select defaultValue="atlantico">
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atlantico">Atlántico</SelectItem>
                      <SelectItem value="bolivar">Bolívar</SelectItem>
                      <SelectItem value="magdalena">Magdalena</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="electionType">Tipo de Elección</Label>
                  <Select defaultValue="gobernacion">
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gobernacion">Gobernación</SelectItem>
                      <SelectItem value="alcaldia">Alcaldía</SelectItem>
                      <SelectItem value="concejo">Concejo</SelectItem>
                      <SelectItem value="asamblea">Asamblea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descripción de la campaña..."
                  className="bg-zinc-800/50 border-zinc-700 min-h-[100px]"
                />
              </div>

              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  <h4 className="font-medium text-foreground">Cobertura Territorial</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Municipios:</span>
                    <span className="text-foreground ml-2 font-medium">23</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zonas:</span>
                    <span className="text-foreground ml-2 font-medium">89</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Puestos:</span>
                    <span className="text-foreground ml-2 font-medium">456</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mesas:</span>
                    <span className="text-foreground ml-2 font-medium">2,345</span>
                  </div>
                </div>
              </div>

              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => notify("Guardar campaña")}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibir alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Canales de Notificación</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Email</p>
                        <p className="text-sm text-muted-foreground">
                          Recibe notificaciones por correo electrónico
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Push</p>
                        <p className="text-sm text-muted-foreground">
                          Notificaciones push en el navegador
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, push: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">SMS</p>
                        <p className="text-sm text-muted-foreground">
                          Alertas críticas por mensaje de texto
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, sms: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Tipos de Alertas</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      <div>
                        <p className="font-medium text-foreground">Alertas Críticas</p>
                        <p className="text-sm text-muted-foreground">
                          Irregularidades, fraude, incidentes de seguridad
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.alerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, alerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="font-medium text-foreground">Reportes de Equipo</p>
                        <p className="text-sm text-muted-foreground">
                          Actualizaciones de testigos y coordinadores
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.reports}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, reports: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => notify("Guardar preferencias de notificación")}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Preferencias
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña regularmente para mayor seguridad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => notify("Actualizar contraseña")}
              >
                <Lock className="h-4 w-4 mr-2" />
                Actualizar Contraseña
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Sesiones Activas</CardTitle>
              <CardDescription>
                Administra los dispositivos donde has iniciado sesión
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Chrome - Windows</p>
                      <Badge className="bg-emerald-500/20 text-emerald-400">Actual</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Barranquilla, Colombia - Activo ahora
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Safari - iPhone</p>
                    <p className="text-sm text-muted-foreground">
                      Barranquilla, Colombia - Hace 2 horas
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent border-zinc-700 text-red-400"
                    onClick={() => notify("Cerrar sesión en Safari - iPhone")}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full bg-transparent border-zinc-700 text-red-400"
                onClick={() => notify("Cerrar todas las sesiones")}
              >
                Cerrar Todas las Sesiones
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Claves de acceso para integraciones externas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mapbox API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      defaultValue="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja..."
                      className="bg-zinc-800/50 border-zinc-700 pr-10"
                      readOnly
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="bg-transparent border-zinc-700"
                    onClick={() => notify("Regenerar API Key")}
                  >
                    Regenerar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    defaultValue="https://api.seguridad-electoral.com/webhook/..."
                    className="bg-zinc-800/50 border-zinc-700"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    className="bg-transparent border-zinc-700"
                    onClick={() => notify("Copiar webhook")}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Servicios Conectados</CardTitle>
              <CardDescription>
                Integraciones activas con servicios externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Globe className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Mapbox</p>
                    <p className="text-sm text-muted-foreground">
                      Mapas y visualización geográfica
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400">Conectado</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Database className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Vercel Blob</p>
                    <p className="text-sm text-muted-foreground">
                      Almacenamiento de archivos y evidencia
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400">Conectado</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Bell className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Twilio</p>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones SMS
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="bg-transparent border-zinc-700">
                  Conectar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
