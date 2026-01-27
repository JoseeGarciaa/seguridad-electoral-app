import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, DELEGATE_ROLE } from "@/lib/auth"
import { pool } from "@/lib/pg"

const fallbackData = {
  items: [
    {
      id: "EV-IMG-1",
      type: "image",
      title: "Acta mesa 12",
      description: "Foto legible",
      municipality: "Bogotá",
      pollingStation: "PU-12",
      uploadedBy: "Delegado",
      uploadedById: null,
      uploadedAt: new Date().toISOString(),
      status: "verified",
      url: "https://placehold.co/600x400",
      tags: ["acta", "urbano"],
      voteReportId: null,
    },
  ],
  stats: {
    total: 1,
    images: 1,
    videos: 0,
    documents: 0,
    verified: 1,
  },
}

// GET /api/evidences - list evidences with optional filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isDelegate = user.role === DELEGATE_ROLE
  const delegateId = isDelegate ? user.delegateId : null
  if (isDelegate && !delegateId) {
    return NextResponse.json({ error: "Perfil de testigo electoral incompleto" }, { status: 403 })
  }
  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get("search")?.trim() || ""
  const type = searchParams.get("type") || ""
  const status = searchParams.get("status") || ""
  const municipality = searchParams.get("municipality") || ""
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500)

  const clauses: string[] = []
  const values: any[] = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    clauses.push(`(LOWER(e.title) LIKE $${values.length} OR LOWER(e.description) LIKE $${values.length} OR LOWER(COALESCE(e.municipality, '')) LIKE $${values.length})`)
  }
  if (type) {
    values.push(type)
    clauses.push(`e.type = $${values.length}`)
  }
  if (status) {
    values.push(status)
    clauses.push(`e.status = $${values.length}`)
  }
  if (municipality) {
    values.push(municipality)
    clauses.push(`LOWER(e.municipality) = LOWER($${values.length})`)
  }

  if (delegateId) {
    values.push(delegateId)
    clauses.push(`e.uploaded_by_id = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""

  const listQuery = `
    SELECT e.id, e.type, e.title, e.description, e.municipality, e.polling_station,
           e.uploaded_at, e.status, e.url, e.tags, e.vote_report_id,
           d.id AS uploaded_by_id, COALESCE(d.full_name, 'Delegado') AS uploaded_by
    FROM evidences e
    LEFT JOIN delegates d ON d.id = e.uploaded_by_id
    ${where}
    ORDER BY e.uploaded_at DESC
    LIMIT ${limit}
  `

  const statsWhere = delegateId ? `WHERE uploaded_by_id = $1` : ""
  const statsQuery = `
    SELECT
      COUNT(*) FILTER (WHERE type = 'image') AS images,
      COUNT(*) FILTER (WHERE type = 'video') AS videos,
      COUNT(*) FILTER (WHERE type = 'document') AS documents,
      COUNT(*) FILTER (WHERE status = 'verified') AS verified,
      COUNT(*) AS total
    FROM evidences
    ${statsWhere}
  `

  if (!pool) {
    console.warn("DATABASE_URL not set; serving evidences fallback data")
    return NextResponse.json(fallbackData)
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
          type: row.type as string,
          title: row.title as string,
          description: row.description as string | null,
          municipality: row.municipality as string | null,
          pollingStation: row.polling_station as string | null,
          uploadedBy: row.uploaded_by as string,
          uploadedById: row.uploaded_by_id as string | null,
          uploadedAt: row.uploaded_at as string,
          status: row.status as string,
          url: row.url as string,
          tags: (row.tags as string[]) ?? [],
          voteReportId: row.vote_report_id as string | null,
        })),
        stats: {
          total: Number(statsRes.rows[0]?.total ?? 0),
          images: Number(statsRes.rows[0]?.images ?? 0),
          videos: Number(statsRes.rows[0]?.videos ?? 0),
          documents: Number(statsRes.rows[0]?.documents ?? 0),
          verified: Number(statsRes.rows[0]?.verified ?? 0),
        },
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Evidences GET error", error)
    return NextResponse.json({ ...fallbackData, warning: "DB no disponible, usando datos de respaldo" })
  }
}

// POST /api/evidences - create evidence record
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isDelegate = user.role === DELEGATE_ROLE
  const delegateId = isDelegate ? user.delegateId : null
  if (isDelegate && !delegateId) {
    return NextResponse.json({ error: "Perfil de testigo electoral incompleto" }, { status: 403 })
  }

  if (!pool) {
    return NextResponse.json({ error: "DB no disponible en modo demo" }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const {
    type,
    title,
    url,
    status,
    description = null,
    municipality = null,
    pollingStation = null,
    uploadedById = null,
    tags = [],
    voteReportId = null,
  } = body

  const enforcedUploadedById = isDelegate ? delegateId : uploadedById

  if (!type || !title || !url || !status) {
    return NextResponse.json({ error: "type, title, url y status son requeridos" }, { status: 400 })
  }

  if (isDelegate && !enforcedUploadedById) {
    return NextResponse.json({ error: "No se puede registrar evidencia sin delegado asignado" }, { status: 403 })
  }

  try {
    const client = await pool.connect()
    try {
      const insertQuery = `
        INSERT INTO evidences (
          type, title, description, municipality, polling_station, uploaded_by_id,
          status, url, tags, vote_report_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, uploaded_at
      `
      const values = [
        type,
        title,
        description,
        municipality,
        pollingStation,
        enforcedUploadedById,
        status,
        url,
        tags,
        voteReportId,
      ]

      const { rows } = await client.query(insertQuery, values)
      const row = rows[0]

      return NextResponse.json({
        id: row.id as string,
        uploadedAt: row.uploaded_at as string,
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Evidences POST error", error)
    return NextResponse.json({ error: "Failed to create evidence" }, { status: 500 })
  }
}
