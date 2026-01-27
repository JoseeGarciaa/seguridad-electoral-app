import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "EV-101",
      title: "Caravana barrio centro",
      date: new Date(Date.now() + 86400000).toISOString(),
      hour: "16:00",
      place: "Parque Central",
      type: "movilización",
      attendance: 320,
      lead: "Coordinación zonal",
      status: "confirmado",
    },
    {
      id: "EV-102",
      title: "Formación jurados",
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      hour: "09:00",
      place: "Colegio Distrital",
      type: "formación",
      attendance: 85,
      lead: "Laura Méndez",
      status: "planificado",
    },
    {
      id: "EV-103",
      title: "Reunión líderes comunales",
      date: null,
      hour: null,
      place: "Casa comunal",
      type: "territorial",
      attendance: 45,
      lead: "Equipo territorio",
      status: "borrador",
    },
  ],
  stats: {
    total: 3,
    confirmados: 1,
    aforo: 450,
    proximo: new Date(Date.now() + 86400000).toISOString(),
  },
}

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
    console.warn("DATABASE_URL not set; serving events fallback data")
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
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
