import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const type = searchParams.get("type") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(title) LIKE $${values.length} OR LOWER(COALESCE(place,'')) LIKE $${values.length})`)
  }
  if (type) {
    values.push(type)
    filters.push(`type = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT id, title, date, hour, place, type, attendance, lead, status
    FROM events
    ${where}
    ORDER BY date DESC NULLS LAST, created_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'confirmado') AS confirmados,
      COALESCE(SUM(attendance),0) AS aforo,
      MIN(date) FILTER (WHERE date >= now()) AS proximo
    FROM events
  `

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 })
  }

  try {
    const client = await pool.connect()
    try {
      const tableCheck = await client.query("SELECT to_regclass('public.events') AS reg")
      if (!tableCheck.rows[0]?.reg) {
        return NextResponse.json({
          items: [],
          stats: {
            total: 0,
            confirmados: 0,
            aforo: 0,
            proximo: null,
          },
        })
      }

      const [listRes, statsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery),
      ])

      return NextResponse.json({
        items: listRes.rows.map((row) => ({
          id: row.id as string,
          title: row.title as string,
          date: row.date ? new Date(row.date).toISOString() : null,
          hour: row.hour as string | null,
          place: row.place as string | null,
          type: row.type as string,
          attendance: Number(row.attendance ?? 0),
          lead: row.lead as string | null,
          status: row.status as string,
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          confirmados: Number(statsRes.rows[0]?.confirmados ?? 0),
          aforo: Number(statsRes.rows[0]?.aforo ?? 0),
          proximo: statsRes.rows[0]?.proximo ? new Date(statsRes.rows[0].proximo).toISOString() : null,
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Events GET error", error)
    return NextResponse.json({ error: "No se pudieron obtener eventos" }, { status: 500 })
  }
}
