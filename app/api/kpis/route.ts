import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

export async function GET(req: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  try {
    const client = await pool.connect()
    try {
      const [kpiTable, milestonesTable] = await Promise.all([
        client.query("SELECT to_regclass('public.kpi_metrics') AS reg"),
        client.query("SELECT to_regclass('public.milestones') AS reg"),
      ])

      if (!kpiTable.rows[0]?.reg || !milestonesTable.rows[0]?.reg) {
        return NextResponse.json({ kpis: [], milestones: [] })
      }

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
    return NextResponse.json({ error: "No se pudo obtener KPIs" }, { status: 500 })
  }
}
