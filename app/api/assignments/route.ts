import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "A-101",
      title: "Organizar testigos en Zona 12",
      assignee: "Maria Ríos",
      municipality: "Bogotá",
      zone: "12",
      due: new Date(Date.now() + 86400000).toISOString(),
      priority: "alta",
      status: "en progreso",
      progress: 65,
      tasks: 8,
    },
    {
      id: "A-102",
      title: "Revisión logística puestos urbanos",
      assignee: "Andrés León",
      municipality: "Medellín",
      zone: "04",
      due: new Date(Date.now() + 3 * 86400000).toISOString(),
      priority: "media",
      status: "programado",
      progress: 35,
      tasks: 5,
    },
    {
      id: "A-103",
      title: "Capacitación jurados zona rural",
      assignee: "Laura Gómez",
      municipality: "Villavicencio",
      zone: "08",
      due: null,
      priority: "baja",
      status: "pendiente",
      progress: 10,
      tasks: 3,
    },
  ],
  stats: {
    total: 3,
    pendientes: 1,
    progreso: 1,
    programadas: 1,
    avancePromedio: 37,
  },
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const priority = searchParams.get("priority") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(a.title) LIKE $${values.length} OR LOWER(COALESCE(a.municipality,'')) LIKE $${values.length})`)
  }
  if (priority) {
    values.push(priority)
    filters.push(`a.priority = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`a.status = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT a.id, a.title, a.priority, a.status, a.progress, a.tasks_count,
           a.municipality, a.zone, a.due_date,
           d.full_name AS assignee, COALESCE(d.municipality, '') AS assignee_muni
    FROM assignments a
    LEFT JOIN delegates d ON d.id = a.assignee_id
    ${where}
    ORDER BY a.updated_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pendiente') AS pendientes,
      COUNT(*) FILTER (WHERE status = 'en progreso') AS progreso,
      COUNT(*) FILTER (WHERE status = 'programado') AS programadas,
      COALESCE(ROUND(AVG(progress)),0) AS avance_promedio
    FROM assignments
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving assignments fallback data")
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
          assignee: (row.assignee as string) ?? "",
          municipality: (row.municipality as string) ?? "",
          zone: (row.zone as string) ?? "",
          due: row.due_date ? new Date(row.due_date).toISOString() : null,
          priority: row.priority as string,
          status: row.status as string,
          progress: Number(row.progress ?? 0),
          tasks: Number(row.tasks_count ?? 0),
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          pendientes: Number(statsRes.rows[0]?.pendientes ?? 0),
          progreso: Number(statsRes.rows[0]?.progreso ?? 0),
          programadas: Number(statsRes.rows[0]?.programadas ?? 0),
          avancePromedio: Number(statsRes.rows[0]?.avance_promedio ?? 0),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Assignments GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
