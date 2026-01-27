import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  kpis: [
    { id: "KPI-1", title: "Visitas logradas", value: "1,240", target: "1,800", progress: 68, detail: "Cobertura urbana" },
    { id: "KPI-2", title: "Voluntarios activos", value: "320", target: "500", progress: 64, detail: "Reportaron en la semana" },
  ],
  milestones: [
    { id: "MS-1", title: "Cierre de capacitación", date: new Date(Date.now() + 5 * 86400000).toISOString(), progress: 70, tag: "operativo" },
  ],
}

export async function GET(req: NextRequest) {
  if (!pool) {
    console.warn("DATABASE_URL not set; serving KPIs fallback data")
    return NextResponse.json(fallbackData)
  }

  try {
    const client = await pool.connect()
    try {
      const [kpiRes, milestonesRes] = await Promise.all([
        client.query(`SELECT id, title, value, target, progress, detail FROM kpi_metrics ORDER BY updated_at DESC`),
        client.query(`SELECT id, title, date, progress, tag FROM milestones ORDER BY date ASC`),
      ])

      return NextResponse.json({
        kpis: kpiRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          value: row.value as string,
          target: row.target as string,
          progress: Number(row.progress ?? 0),
          detail: row.detail as string | null,
        })),
        milestones: milestonesRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          date: row.date ? new Date(row.date).toISOString() : null,
          progress: Number(row.progress ?? 0),
          tag: row.tag as string,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("KPIs GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
