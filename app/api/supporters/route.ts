import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "S-101",
      name: "Carolina Mendoza",
      municipality: "barranquilla",
      zone: "12",
      phone: "3015551212",
      email: "carolina@example.com",
      commitment: 80,
      status: "confirmado",
      channel: "voluntario",
      tags: ["lider", "juventud"],
    },
    {
      id: "S-102",
      name: "Jorge Patiño",
      municipality: "soledad",
      zone: "08",
      phone: "3025554545",
      email: "jorge@example.com",
      commitment: 55,
      status: "activo",
      channel: "puerta a puerta",
      tags: ["barrio", "movilidad"],
    },
    {
      id: "S-103",
      name: "Liliana Ruiz",
      municipality: "malambo",
      zone: "05",
      phone: null,
      email: "",
      commitment: 25,
      status: "en validación",
      channel: "referido",
      tags: ["seguimiento"],
    },
  ],
  stats: {
    total: 3,
    confirmados: 1,
    activos: 1,
    porValidar: 1,
  },
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const status = searchParams.get("status") ?? ""
  const municipality = searchParams.get("municipality") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 300), 500)

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(full_name) LIKE $${values.length} OR LOWER(COALESCE(email,'')) LIKE $${values.length} OR LOWER(COALESCE(municipality_code,'')) LIKE $${values.length})`)
  }
  if (status) {
    values.push(status)
    filters.push(`status = $${values.length}`)
  }
  if (municipality) {
    values.push(municipality)
    filters.push(`LOWER(municipality_code) = LOWER($${values.length})`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT id, full_name, municipality_code, zone, phone, email, commitment, status, channel, tags, created_at
    FROM supporters
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'confirmado') AS confirmados,
      COUNT(*) FILTER (WHERE status = 'activo') AS activos,
      COUNT(*) FILTER (WHERE status = 'en validación') AS por_validar
    FROM supporters
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving supporters fallback data")
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
          name: row.full_name as string,
          municipality: row.municipality_code as string | null,
          zone: row.zone as string | null,
          phone: row.phone as string | null,
          email: row.email as string | null,
          commitment: Number(row.commitment ?? 0),
          status: row.status as string,
          channel: row.channel as string,
          tags: (row.tags as string[]) ?? [],
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          confirmados: Number(statsRes.rows[0]?.confirmados ?? 0),
          activos: Number(statsRes.rows[0]?.activos ?? 0),
          porValidar: Number(statsRes.rows[0]?.por_validar ?? 0),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Supporters GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}
