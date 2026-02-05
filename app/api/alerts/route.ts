import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() ?? ""
  const level = searchParams.get("level") ?? ""
  const status = searchParams.get("status") ?? ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 400)

  const isWitness = user.role === "delegate" || user.role === "witness"
  let delegateId = isWitness ? user.delegateId : null
  if (isWitness && !delegateId && user.email) {
    try {
      const fallback = await pool?.query(`SELECT id FROM delegates WHERE LOWER(email) = LOWER($1) LIMIT 1`, [user.email])
      delegateId = (fallback?.rows[0]?.id as string | undefined) ?? null
    } catch (err) {
      console.warn("delegate fallback lookup failed", err)
    }
  }
  if (isWitness && !delegateId) {
    return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 } })
  }

  const filters: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(
      `(LOWER(COALESCE(vr.municipality,'')) LIKE $${values.length} OR LOWER(COALESCE(vr.polling_station_code,'')) LIKE $${values.length} OR LOWER(COALESCE(d.full_name, '')) LIKE $${values.length})`
    )
  }
  if (level) {
    values.push(level)
    filters.push(`'media' = $${values.length}`)
  }
  if (status) {
    values.push(status)
    filters.push(`'abierta' = $${values.length}`)
  }
  if (delegateId) {
    values.push(delegateId)
    filters.push(`vr.delegate_id = $${values.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""

  const listQuery = `
    SELECT vr.id,
           vr.polling_station_code,
           vr.municipality,
           vr.reported_at,
           vr.total_votes,
           COALESCE(d.full_name, 'Delegado') AS delegate_name
    FROM vote_reports vr
    LEFT JOIN delegates d ON d.id = vr.delegate_id
    ${where}
    ORDER BY vr.reported_at DESC NULLS LAST, vr.created_at DESC
    LIMIT ${limit}
  `

  const statsQuery = `
    SELECT
      COUNT(*) AS total,
      0 AS criticas,
      COUNT(*) AS abiertas
    FROM vote_reports vr
    ${delegateId ? "WHERE vr.delegate_id = $1" : ""}
  `

  if (!pool) {
    return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 } })
  }

  try {
    const client = await pool.connect()
    try {
      const [listRes, statsRes] = await Promise.all([
        client.query(listQuery, values),
        client.query(statsQuery, delegateId ? [delegateId] : []),
      ])

      return NextResponse.json({
        items: listRes.rows.map((row) => ({
          id: row.id as string,
          title: `Nuevo reporte de votos (${row.delegate_name ?? "Delegado"})`,
          level: "media",
          category: "votos",
          municipality: (row.municipality as string | null) ?? "Sin municipio",
          time: row.reported_at ? new Date(row.reported_at).toISOString() : null,
          status: "abierta",
          detail: `Mesa ${row.polling_station_code ?? "Sin código"} · Total votos ${Number(row.total_votes ?? 0)}`,
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
    if ((error as any)?.code === "42P01") {
      return NextResponse.json({ items: [], stats: { total: 0, criticas: 0, abiertas: 0 } })
    }
    return NextResponse.json({ error: "No se pudo cargar alertas" }, { status: 500 })
  }
}
