"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Phone,
  Mail,
  Radio,
  Send,
  Sparkles,
  Mic,
  Filter,
  Users,
  Megaphone,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const inbox = [
  {
    id: "MSG-991",
    sender: "Testigo Zona Norte",
    channel: "WhatsApp",
    preview: "Acta mesa 034 cargada. Se ve una irregularidad...",
    time: "Hace 4 min",
    unread: true,
  },
  {
    id: "MSG-992",
    sender: "Coordinación Jurídica",
    channel: "Correo",
    preview: "Adjuntamos plantilla de reporte y lineamientos...",
    time: "Hace 12 min",
    unread: false,
  },
  {
    id: "MSG-993",
    sender: "Ciudadanía",
    channel: "Web",
    preview: "Denuncia de compra de votos en Soledad sector 7",
    time: "Hace 22 min",
    unread: true,
  },
];

const broadcasts = [
  { title: "Recordatorio cierre de mesas", channel: "SMS", reach: 4800, status: "enviado" },
  { title: "Instrucciones cadena de custodia", channel: "Correo", reach: 1200, status: "programado" },
  { title: "Motivación de movilización", channel: "WhatsApp", reach: 3200, status: "borrador" },
];

const statusColor: Record<string, string> = {
  enviado: "bg-emerald-500/20 text-emerald-300",
  programado: "bg-cyan-500/20 text-cyan-300",
  borrador: "bg-zinc-500/20 text-zinc-200",
};

export default function ComunicacionPage() {
  const [channel, setChannel] = useState("todos");

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción simulada para esta demo",
    });

  const filteredInbox = useMemo(() => {
    return inbox.filter((m) => channel === "todos" || m.channel.toLowerCase() === channel);
  }, [channel]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Comunicación</h1>
        <p className="text-sm text-muted-foreground">
          Bandeja y envíos masivos simulados. Solo visual, sin alterar modelo.
        </p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="bg-zinc-800/50 border border-zinc-700">
          <TabsTrigger value="inbox">Bandeja</TabsTrigger>
          <TabsTrigger value="broadcast">Difusión</TabsTrigger>
          <TabsTrigger value="voz">Voz</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtrar canal</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-zinc-800/60 border-zinc-700"
                    onClick={() => notify("Resumen IA")}
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Resumen IA (mock)
                  </Button>
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => notify("Responder mensaje")}
                  >
                    <Send className="h-4 w-4 mr-2" /> Responder
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-3 lg:col-span-1">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "Todos", value: "todos" },
                    { label: "WhatsApp", value: "whatsapp" },
                    { label: "Correo", value: "correo" },
                    { label: "Web", value: "web" },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      variant={channel === item.value ? "default" : "outline"}
                      className={channel === item.value ? "bg-cyan-600" : "bg-zinc-800/50 border-zinc-700"}
                      onClick={() => setChannel(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredInbox.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{msg.sender}</p>
                        {msg.unread && <Badge className="bg-emerald-500/20 text-emerald-300">Nuevo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{msg.preview}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{msg.channel}</span>
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-2 text-sm text-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Resumen rápido
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Se muestran mensajes recientes para demo visual. La funcionalidad de envío no altera datos.
                  </p>
                </div>
                <Textarea
                  placeholder="Responder o documentar comunicación..."
                  className="min-h-[160px] bg-zinc-800/50 border-zinc-700"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge className="bg-cyan-500/15 text-cyan-300">Plantilla</Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-300">Seguimiento</Badge>
                  </div>
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => notify("Enviar respuesta")}
                  >
                    <Send className="h-4 w-4 mr-2" /> Enviar (demo)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Crear difusión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Asunto o título" className="bg-zinc-800/50 border-zinc-700" />
                  <Input placeholder="Segmento (mock)" className="bg-zinc-800/50 border-zinc-700" />
                </div>
                <Textarea
                  placeholder="Mensaje a enviar..."
                  className="min-h-[160px] bg-zinc-800/50 border-zinc-700"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge className="bg-purple-500/20 text-purple-300">Multicanal</Badge>
                    <Badge className="bg-amber-500/20 text-amber-300">Programar</Badge>
                  </div>
                  <Button
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => notify("Simular envío de difusión")}
                  >
                    <Megaphone className="h-4 w-4 mr-2" /> Simular envío
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Historial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {broadcasts.map((b) => (
                  <div key={b.title} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">{b.title}</p>
                      <Badge className={statusColor[b.status]}>{b.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Canal {b.channel} · Alcance {b.reach}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Los envíos son simulados para efectos visuales.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voz" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Guión de llamada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Guión breve para llamadas salientes"
                  className="min-h-[140px] bg-zinc-800/50 border-zinc-700"
                />
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700 w-full"
                  onClick={() => notify("Simular marcación")}
                >
                  <Phone className="h-4 w-4 mr-2" /> Simular marcación
                </Button>
                <p className="text-xs text-muted-foreground">
                  No se realizan llamadas reales; es solo interfaz.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Estado de cola</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["En espera", "Atendiendo", "Finalizadas"].map((label, i) => {
                  const value = [32, 18, 120][i];
                  const percent = [54, 38, 92][i];
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-foreground">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Radios y chat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Radio className="h-4 w-4" />
                  Enlace de radio interna (demo)
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Mic className="h-4 w-4" />
                  Mensajes cortos de voz
                </div>
                <p className="text-xs text-muted-foreground">
                  Elementos ilustrativos para el diseño de comunicación.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
