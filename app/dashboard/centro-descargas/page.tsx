import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DownloadCenterClient } from "@/components/dashboard/download-center-client"

type DownloadTemplate = {
  key: string
  title: string
  description: string
  highlights: string[]
}

const templates: DownloadTemplate[] = [
  {
    key: "reporte-completo",
    title: "Reporte completo detallado",
    description: "Exporta toda la información electoral consolidada por departamento, municipio, puesto y mesa.",
    highlights: [
      "Total de votos por municipio, puesto y mesa",
      "Detalle por partidos y por candidatos",
      "Delegado que reporta y marca de fecha/hora",
    ],
  },
  {
    key: "alertas",
    title: "Descarga alertas",
    description: "Incluye alertas automáticas y manuales con trazabilidad territorial y contexto de votación.",
    highlights: [
      "Departamento y municipio donde se reporta",
      "Votos totales del puesto y de la mesa asociada",
      "Mensaje de alerta (ej. incremento de votantes)",
    ],
  },
  {
    key: "testigos-electorales",
    title: "Testigos electorales",
    description: "Genera la cobertura asignada vs reportada por testigo y por territorio.",
    highlights: [
      "Asignadas vs reportadas vs sin reportar",
      "Desglose por departamento, municipio y puesto",
      "Total de votos reportados por cobertura",
    ],
  },
]

export default async function CentroDescargasPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/dashboard")
  }

  return <DownloadCenterClient templates={templates} />
}
