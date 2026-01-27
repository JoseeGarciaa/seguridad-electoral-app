import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "AL-001",
      title: "Riesgo orden publico",
      level: "crítica",
      category: "seguridad",
      municipality: "Bogotá",
      time: new Date().toISOString(),
      status: "abierta",
      detail: "Reportes de bloqueo en punto de transporte",
    },
    {
      id: "AL-002",
      title: "Falta de jurados",
      level: "media",
      category: "operativa",
      municipality: "Medellín",
      time: new Date().toISOString(),
      status: "abierta",
      detail: "Se requieren 3 jurados de refuerzo",
    },
  ],
  stats: { total: 2, criticas: 1, abiertas: 2 },
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const level = searchParams.get("level") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 400)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(title) LIKE $${values.length} OR LOWER(COALESCE(municipality,'')) LIKE $${values.length})`)
  }
  if (level) {
    values.push(level)
    filters.push(`level = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`status = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT id, title, level, category, municipality, created_at, detail, status
    FROM alerts
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE level = 'crítica') AS criticas,
      COUNT(*) FILTER (WHERE status = 'abierta') AS abiertas
    FROM alerts
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving alerts fallback data")
    return NextResponse.json(fallbackData)
  }

  try {
    const client = await pool.connect()
    try {
      const [listRes, statsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery),
      ])

      return NextResponse.json({
        items: listRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          level: row.level as string,
          category: row.category as string,
          municipality: row.municipality as string | null,
          time: row.created_at ? new Date(row.created_at).toISOString() : null,
          status: row.status as string,
          detail: row.detail as string | null,
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          criticas: Number(statsRes.rows[0]?.criticas ?? 0),
          abiertas: Number(statsRes.rows[0]?.abiertas ?? 0),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Alerts GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
