"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileSpreadsheet, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type DownloadTemplate = {
  key: string
  title: string
  description: string
  highlights: string[]
}

interface DownloadCenterClientProps {
  templates: DownloadTemplate[]
}

function getFileNameFromHeaders(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return basicMatch?.[1] ?? fallback
}

export function DownloadCenterClient({ templates }: DownloadCenterClientProps) {
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)

  const handleDownload = async (templateKey: string) => {
    setLoadingTemplate(templateKey)
    try {
      const response = await fetch(`/api/download-center/${templateKey}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        let backendMessage = "No se pudo generar el archivo"
        try {
          const payload = await response.json()
          if (typeof payload?.error === "string" && payload.error.trim()) {
            backendMessage = payload.error
          }
        } catch {
        }
        throw new Error(`${backendMessage} (HTTP ${response.status})`)
      }

      const blob = await response.blob()
      const fileName = getFileNameFromHeaders(
        response.headers.get("content-disposition"),
        `${templateKey}.xlsx`,
      )

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Descarga iniciada",
        description: `Se generó correctamente la plantilla ${fileName}`,
      })
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "No fue posible generar el archivo en este momento."
      toast({
        title: "Error de descarga",
        description: message,
      })
    } finally {
      setLoadingTemplate(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Centro de descargas</h1>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="mr-1 h-3 w-3" /> Solo admin
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Descarga plantillas Excel optimizadas para reporte ejecutivo y seguimiento gerencial.
      </p>

      <div className="grid gap-4">
        {templates.map((item) => {
          const isLoading = loadingTemplate === item.key
          return (
            <Card key={item.key} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSpreadsheet className="h-4 w-4" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {item.highlights.map((highlight) => (
                    <li key={highlight}>• {highlight}</li>
                  ))}
                </ul>

                <Button
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => handleDownload(item.key)}
                  disabled={loadingTemplate !== null}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {isLoading ? "Generando..." : "Descargar Excel"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
