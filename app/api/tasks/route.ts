import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "T-101",
      title: "Visita punto de coordinación",
      owner: "Equipo zona 3",
      place: "Barranquilla",
      status: "en progreso",
      priority: "alta",
      progress: 60,
      due: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      id: "T-102",
      title: "Validar jurados",
      owner: "Coordinación",
      place: "Soledad",
      status: "pendiente",
      priority: "media",
      progress: 20,
      due: null,
    },
  ],
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 400), 600)

  const filters: string[] = []
  const values: any[] = []

  if (status) {
    values.push(status)
    filters.push(`t.status = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT t.id, t.title, t.owner, t.place, t.status, t.priority, t.progress, t.due_at
    FROM tasks t
    ${where}
    ORDER BY t.updated_at DESC
    LIMIT ${limit}
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving tasks fallback data")
    return NextResponse.json(fallbackData)
  }

  try {
    const client = await pool.connect()
    try {
      const listRes = await client.query(listQuery, values)

      return NextResponse.json({
        items: listRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          owner: row.owner as string,
          place: row.place as string | null,
          status: row.status as string,
          priority: row.priority as string,
          progress: Number(row.progress ?? 0),
          due: row.due_at ? new Date(row.due_at).toISOString() : null,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Tasks GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
